import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TopBar, Progress, Step } from '../components/Layout.jsx';
import { TextField, SelectField, NumberField, Hint } from '../components/Fields.jsx';
import SystemEditor from '../components/standard/SystemEditor.jsx';
import SystemGrid from '../components/standard/SystemGrid.jsx';
import { makeSystem, isSystemComplete } from '../lib/standardModel.js';
import { ENERGY_TYPE_OPTIONS } from '../lib/options.js';
import { readPrefill, readEncodedPrefill } from '../lib/prefill.js';
import { submitForm } from '../lib/api.js';
import { loadDraft, saveDraft, clearDraft } from '../lib/draft.js';
import { scheduleCloudSave, getCloudId, clearCloudId } from '../lib/draftSync.js';
import { GF_CONTACT_EMAIL, GUIDED_MAX } from '../lib/config.js';
import MailListToast from '../components/MailListToast.jsx';

const DRAFT_KEY = 'gf-standard-draft';

export default function StandardForm() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const prefill = useMemo(() => readPrefill(search), [search]);
  // Vorausgefüllter Link von Green Fusion: entweder lang (?prefill=<base64>) oder
  // kurz (?p=<id>, Daten liegen in D1). Der Kunde ergänzt nur das Fehlende (Heizungstyp).
  const encoded = useMemo(() => readEncodedPrefill(search), [search]);
  const shortId = useMemo(() => new URLSearchParams(search).get('p') || '', [search]);
  // Ein vorhandener Entwurf gewinnt (Fortschritt nicht verlieren). Nur wenn KEIN
  // Entwurf existiert, greift der Prefill-Link.
  const draft = useMemo(() => loadDraft(DRAFT_KEY), []);
  // „Beides"-Modus: erst dieses (klassische) Formular, danach Sektorkopplung.
  const both = useMemo(() => new URLSearchParams(search).get('both') === '1', [search]);

  const defaultProject = {
    contactName: encoded?.project?.contactName || prefill.contactName,
    contactRole: encoded?.project?.contactRole || prefill.contactRole,
    company: encoded?.project?.company || prefill.company,
    contactEmail: encoded?.project?.contactEmail || prefill.contactEmail,
    systemCount: String(encoded?.systems?.length || prefill.systemCount || ''),
    defaultEnergyType: encoded?.project?.defaultEnergyType || prefill.defaultEnergyType || '(keine Vorgabe)',
  };

  // Initiale Anlagen aus dem (langen) Prefill-Link; Heizungstyp bleibt leer.
  const initialSystems = encoded?.systems
    ? encoded.systems.map((s) => ({ ...makeSystem(defaultProject), ...s, heatingTypes: s.heatingTypes || [], heatingTypeOther: s.heatingTypeOther || '' }))
    : [];
  const initialPhase = encoded && defaultProject.contactEmail && defaultProject.company ? 'systems' : 'project';

  // phase: 'project' → 'systems' → 'submit'
  const [phase, setPhase] = useState(draft?.phase ?? initialPhase);
  const [project, setProject] = useState(draft?.project ?? defaultProject);
  const [systems, setSystems] = useState(draft?.systems ?? initialSystems);
  const [current, setCurrent] = useState(draft?.current ?? 0);
  const [restored, setRestored] = useState(!!draft);
  const [isPrefill, setIsPrefill] = useState(!!encoded && !draft);
  // Kurzlink (?p=) lädt die Daten asynchron nach – solange zeigen wir einen Ladehinweis.
  const [prefillLoading, setPrefillLoading] = useState(!!shortId && !draft);
  const [consent, setConsent] = useState(false); // bewusst nicht gespeichert
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  // Kurzlink: Prefill-Daten vom Server holen und anwenden (nur wenn kein Entwurf existiert).
  useEffect(() => {
    if (!shortId || draft) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/prefill?id=' + encodeURIComponent(shortId));
        const body = await res.json().catch(() => ({}));
        if (!cancelled && body.ok && body.payload) {
          const pl = body.payload;
          const proj = {
            contactName: pl.project?.contactName || '',
            contactRole: pl.project?.contactRole || '',
            company: pl.project?.company || '',
            contactEmail: pl.project?.contactEmail || '',
            systemCount: String(pl.systems?.length || ''),
            defaultEnergyType: pl.project?.defaultEnergyType || '(keine Vorgabe)',
          };
          setProject(proj);
          setSystems((pl.systems || []).map((s) => ({ ...makeSystem(proj), ...s, heatingTypes: s.heatingTypes || [], heatingTypeOther: s.heatingTypeOther || '' })));
          setIsPrefill(true);
          if (proj.contactEmail && proj.company) setPhase('systems');
        }
      } catch {
        /* Link ungültig/abgelaufen – Kunde startet dann mit leerem Formular */
      }
      if (!cancelled) setPrefillLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortId]);

  // Zwischenspeichern im Browser + (entprellt) in der Cloud bei jeder Änderung.
  useEffect(() => {
    saveDraft(DRAFT_KEY, { phase, project, systems, current });
    const hasContent =
      !!(project.company || project.contactName || project.contactEmail) ||
      systems.some((s) => s.streetHeating || s.plz || s.heatedAreaM2 || s.consumptionLastYear);
    scheduleCloudSave(DRAFT_KEY, 'standard', { project, systems }, hasContent);
  }, [phase, project, systems, current]);

  const count = Math.max(1, Math.min(parseInt(project.systemCount, 10) || 1, 1000));
  const mode = count > GUIDED_MAX ? 'grid' : 'guided';

  const setProjectField = (key) => (val) => setProject((p) => ({ ...p, [key]: val }));

  function resetAll() {
    clearDraft(DRAFT_KEY);
    clearCloudId(DRAFT_KEY);
    setProject(defaultProject);
    setSystems([]);
    setCurrent(0);
    setConsent(false);
    setPhase('project');
    setRestored(false);
    setErrors([]);
  }

  // ---- Projektebene abschließen → Anlagen erzeugen ----
  function startSystems() {
    const errs = [];
    if (!project.contactName.trim()) errs.push('Bitte sagen Sie uns kurz Ihren Namen.');
    if (!project.company.trim()) errs.push('Bitte tragen Sie Ihr Unternehmen ein.');
    if (!project.contactEmail.trim()) errs.push('Wir brauchen Ihre E-Mail, um Ihnen die Bestätigung zu schicken.');
    if (!project.systemCount || parseInt(project.systemCount, 10) < 1) errs.push('Wie viele Anlagen möchten Sie erfassen?');
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSystems((arr) => {
      const out = [];
      for (let i = 0; i < count; i++) out.push(arr[i] || makeSystem(project));
      return out;
    });
    setCurrent(0);
    setPhase('systems');
  }

  const updateSystem = (index, partial) =>
    setSystems((arr) => arr.map((s, i) => (i === index ? { ...s, ...partial } : s)));

  const copyFromPrevious = (index) =>
    setSystems((arr) => arr.map((s, i) => (i === index ? makeSystem(project, arr[index - 1]) : s)));

  // ---- Absenden ----
  async function handleSubmit() {
    setErrors([]);
    setSubmitting(true);
    try {
      const res = await submitForm({
        type: 'standard',
        project,
        systems,
        privacyConsent: consent,
        draftId: getCloudId(DRAFT_KEY),
      });
      clearDraft(DRAFT_KEY);
      clearCloudId(DRAFT_KEY);
      if (both) {
        // Kontaktdaten an das Sektorkopplungs-Formular weiterreichen und dorthin wechseln.
        sessionStorage.setItem(
          'gf-both-contact',
          JSON.stringify({ contactName: project.contactName, company: project.company, contactEmail: project.contactEmail }),
        );
        navigate('/sektorkopplung?both=1');
      } else {
        navigate('/danke', { state: { mock: res.mock } });
      }
    } catch (err) {
      setErrors(err.errors || [err.message]);
      setSubmitting(false);
    }
  }

  const completedCount = systems.filter(isSystemComplete).length;
  const totalCount = mode === 'grid' ? systems.length || count : count;

  // Notausgang-Mail (Liste per Mail schicken)
  const mailtoHref =
    `mailto:${GF_CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent('Anlagenliste – ' + (project.company || 'Ihr Unternehmen'))}` +
    `&body=${encodeURIComponent(
      'Hallo,\n\nanbei unsere vorhandene Anlagenliste (Excel/PDF). Bitte melden Sie sich, wenn etwas fehlt.\n\nViele Grüße\n' +
        (project.contactName || ''),
    )}`;

  const wideShell = phase === 'systems' && mode === 'grid';

  // Kurzlink: kurzer Ladehinweis, während die vorbereiteten Daten geholt werden.
  if (prefillLoading) {
    return (
      <div className="gf-page">
        <TopBar />
        <div className="gf-center">
          <div style={{ textAlign: 'center', color: 'var(--gf-steel-smoke)' }}>
            <div className="gf-spinner" style={{ margin: '0 auto 12px', borderTopColor: 'var(--gf-primary)' }} />
            Einen Moment — wir laden Ihre vorbereiteten Anlagen…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-page">
      <TopBar />
      <div className={'gf-shell' + (wideShell ? ' gf-shell-wide' : '')}>
        {phase === 'project' && <Progress percent={5} label="Schritt 1: ein paar Eckdaten zu Ihnen" />}
        {phase === 'systems' && mode === 'guided' && (
          <Progress percent={10 + (current / count) * 80} label={`Anlage ${current + 1} von ${count}`} />
        )}
        {phase === 'systems' && mode === 'grid' && (
          <Progress
            percent={10 + (completedCount / Math.max(1, totalCount)) * 80}
            label={`${completedCount} von ${totalCount} Anlagen vollständig`}
          />
        )}
        {phase === 'submit' && <Progress percent={95} label="Letzter Schritt: Absenden" />}

        {both && (
          <Hint kind="info">
            <strong>Teil 1 von 2:</strong> Zuerst Ihre klassischen Heizungen. Danach geht es weiter mit
            Wärmepumpe/Solar.
          </Hint>
        )}

        {isPrefill && (
          <Hint kind="info">
            <strong>Wir haben Ihre Anlagen für Sie vorbereitet.</strong> Bitte ergänzen Sie noch den
            Heizungstyp je Anlage und prüfen die Werte — danach können Sie absenden.
          </Hint>
        )}

        {restored && (
          <Hint kind="info">
            Willkommen zurück — wir haben Ihren letzten Stand wiederhergestellt.{' '}
            <button type="button" className="gf-btn gf-btn-text" onClick={resetAll} style={{ padding: 0 }}>
              Neu beginnen
            </button>
          </Hint>
        )}

        <AnimatePresence mode="wait">
          {/* ============ PHASE 1: PROJEKT / BEGRÜSSUNG ============ */}
          {phase === 'project' && (
            <Step stepKey="project">
              <span className="gf-eyebrow">Klassische Heizung optimieren</span>
              <h1 className="gf-step-title">Schön, dass Sie da sind</h1>
              <p className="gf-step-sub">
                Wir wissen, Formulare sind selten ein Vergnügen. Wir halten's kurz: ein paar Eckdaten zu Ihren
                Anlagen, damit wir Ihnen schwarz auf weiß ausrechnen können, was Sie sparen. Schätzen reicht
                völlig — den Rest klären wir gemeinsam. Rechnen Sie mit etwa 2 Minuten pro Anlage.
              </p>
              <p className="gf-help">
                Ihre Eingaben werden automatisch und sicher (EU) zwischengespeichert, damit nichts verloren
                geht — und nach 30 Tagen automatisch gelöscht.
              </p>

              <TextField label="Wie heißen Sie?" value={project.contactName} onChange={setProjectField('contactName')} required />
              <TextField label="Ihre Rolle / Funktion" value={project.contactRole} onChange={setProjectField('contactRole')} help="Optional." />
              <TextField label="Unternehmensname" value={project.company} onChange={setProjectField('company')} required />
              <TextField
                label="Ihre E-Mail"
                value={project.contactEmail}
                onChange={setProjectField('contactEmail')}
                required
                type="email"
                help="Hierhin schicken wir Ihnen die Bestätigung — kein Newsletter, kein Spam."
              />
              <NumberField
                label="Wie viele Anlagen möchten Sie erfassen?"
                value={project.systemCount}
                onChange={setProjectField('systemCount')}
                required
                min={1}
                help={`Bis ${GUIDED_MAX} gehen wir gemeinsam durch, ab ${GUIDED_MAX + 1} bekommen Sie eine Tabelle wie in Excel.`}
              />
              <SelectField
                label="Laufen die meisten Anlagen mit demselben Energieträger?"
                value={project.defaultEnergyType}
                onChange={setProjectField('defaultEnergyType')}
                options={ENERGY_TYPE_OPTIONS}
                help="Optional — wir tragen ihn dann schon mal vor; ändern können Sie ihn je Anlage."
              />

              {errors.length > 0 && <ErrorBox errors={errors} />}

              <div className="gf-actions">
                <span />
                <button className="gf-btn gf-btn-primary" onClick={startSystems}>
                  Los geht's →
                </button>
              </div>
            </Step>
          )}

          {/* ============ PHASE 2a: GEFÜHRT (wenige Anlagen) ============ */}
          {phase === 'systems' && mode === 'guided' && systems[current] && (
            <Step stepKey={`system-${current}`}>
              <span className="gf-eyebrow">
                Anlage {current + 1} von {count}
              </span>
              <h1 className="gf-step-title" style={{ marginBottom: 16 }}>Erzählen Sie uns von dieser Anlage</h1>

              {current > 0 && (
                <button
                  type="button"
                  className="gf-btn gf-btn-ghost"
                  style={{ marginBottom: 16 }}
                  onClick={() => copyFromPrevious(current)}
                >
                  ↧ Werte von letzter Anlage übernehmen
                </button>
              )}

              <SystemEditor system={systems[current]} onChange={(partial) => updateSystem(current, partial)} />

              <div className="gf-actions">
                <button
                  className="gf-btn gf-btn-ghost"
                  onClick={() => (current === 0 ? setPhase('project') : setCurrent((c) => c - 1))}
                >
                  ← Zurück
                </button>
                {current < count - 1 ? (
                  <button className="gf-btn gf-btn-primary" onClick={() => setCurrent((c) => c + 1)}>
                    Nächste Anlage →
                  </button>
                ) : (
                  <button className="gf-btn gf-btn-primary" onClick={() => setPhase('submit')}>
                    Weiter zur Übersicht →
                  </button>
                )}
              </div>
            </Step>
          )}

          {/* ============ PHASE 2b: TABELLE (viele Anlagen) ============ */}
          {phase === 'systems' && mode === 'grid' && (
            <Step stepKey="grid">
              <span className="gf-eyebrow">Ihre Anlagen</span>
              <h1 className="gf-step-title">Tragen Sie Ihre Anlagen ein</h1>
              <p className="gf-step-sub">
                Am schnellsten geht's, wenn Sie Ihre vorhandene Liste einfach hineinkopieren. Schätzen ist
                überall okay — wir prüfen die Zahlen später gemeinsam.
              </p>

              <SystemGrid systems={systems} setSystems={setSystems} project={project} />

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => setPhase('project')}>
                  ← Zurück
                </button>
                <button className="gf-btn gf-btn-primary" onClick={() => setPhase('submit')}>
                  Weiter zur Übersicht →
                </button>
              </div>
            </Step>
          )}

          {/* ============ PHASE 3: ABSENDEN ============ */}
          {phase === 'submit' && (
            <Step stepKey="submit">
              <span className="gf-eyebrow">Fast geschafft</span>
              <h1 className="gf-step-title">Kurz drübergeschaut — dann ab zu uns</h1>
              <p className="gf-step-sub">
                {completedCount} von {totalCount} Anlagen sind vollständig. Was noch fehlt, können Sie ergänzen
                oder uns später nachreichen.
              </p>

              {completedCount < totalCount && (
                <Hint kind="soft">
                  Bei {totalCount - completedCount} Anlage(n) fehlt noch eine Pflichtangabe. Eine grobe Schätzung
                  genügt — gehen Sie einfach nochmal zurück.
                </Hint>
              )}

              <div className="gf-consent">
                <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <label htmlFor="consent">
                  Ja, Green Fusion darf diese Angaben nutzen, um meine mögliche Ersparnis zu berechnen. Verschickt
                  wird das über den EU-Dienst Brevo. Mehr passiert damit nicht.
                </label>
              </div>

              {errors.length > 0 && <ErrorBox errors={errors} />}

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => setPhase('systems')}>
                  ← Zurück
                </button>
                <button className="gf-btn gf-btn-primary" disabled={!consent || submitting} onClick={handleSubmit}>
                  {submitting ? <span className="gf-spinner" /> : 'Absenden'}
                </button>
              </div>
            </Step>
          )}
        </AnimatePresence>
      </div>
      <MailListToast mailtoHref={mailtoHref} />
    </div>
  );
}

function ErrorBox({ errors }) {
  return (
    <Hint kind="error">
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {errors.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </Hint>
  );
}
