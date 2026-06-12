import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TopBar, Progress, Step } from '../components/Layout.jsx';
import { TextField, SelectField, NumberField, Hint } from '../components/Fields.jsx';
import SystemEditor from '../components/standard/SystemEditor.jsx';
import SystemGrid from '../components/standard/SystemGrid.jsx';
import { makeSystem, isSystemComplete } from '../lib/standardModel.js';
import { ENERGY_TYPE_OPTIONS, BILLING_CYCLES } from '../lib/options.js';
import { readPrefill } from '../lib/prefill.js';
import { submitForm } from '../lib/api.js';
import { loadDraft, saveDraft, clearDraft } from '../lib/draft.js';
import { GF_CONTACT_EMAIL, GUIDED_MAX } from '../lib/config.js';
import MailListToast from '../components/MailListToast.jsx';

const DRAFT_KEY = 'gf-standard-draft';

export default function StandardForm() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const prefill = useMemo(() => readPrefill(search), [search]);
  const draft = useMemo(() => loadDraft(DRAFT_KEY), []);

  const defaultProject = {
    contactName: prefill.contactName,
    contactRole: prefill.contactRole,
    company: prefill.company,
    contactEmail: prefill.contactEmail,
    systemCount: prefill.systemCount || '',
    defaultEnergyType: prefill.defaultEnergyType || '(keine Vorgabe)',
    billingCycle: prefill.billingCycle || '(keine Angabe)',
  };

  // phase: 'project' → 'systems' → 'submit'
  const [phase, setPhase] = useState(draft?.phase ?? 'project');
  const [project, setProject] = useState(draft?.project ?? defaultProject);
  const [systems, setSystems] = useState(draft?.systems ?? []);
  const [current, setCurrent] = useState(draft?.current ?? 0);
  const [restored, setRestored] = useState(!!draft);
  const [consent, setConsent] = useState(false); // bewusst nicht gespeichert
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  // Zwischenspeichern im Browser bei jeder Änderung.
  useEffect(() => {
    saveDraft(DRAFT_KEY, { phase, project, systems, current });
  }, [phase, project, systems, current]);

  const count = Math.max(1, Math.min(parseInt(project.systemCount, 10) || 1, 1000));
  const mode = count > GUIDED_MAX ? 'grid' : 'guided';

  const setProjectField = (key) => (val) => setProject((p) => ({ ...p, [key]: val }));

  function resetAll() {
    clearDraft(DRAFT_KEY);
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
      const res = await submitForm({ type: 'standard', project, systems, privacyConsent: consent });
      clearDraft(DRAFT_KEY);
      navigate('/danke', { state: { mock: res.mock } });
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

              <TextField label="Wie heißen Sie?" value={project.contactName} onChange={setProjectField('contactName')} required />
              <TextField label="Ihre Rolle / Funktion" value={project.contactRole} onChange={setProjectField('contactRole')} help="Optional." />
              <TextField label="Für welches Unternehmen?" value={project.company} onChange={setProjectField('company')} required />
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
              <SelectField
                label="In welchem Turnus rechnen Sie ab?"
                value={project.billingCycle}
                onChange={setProjectField('billingCycle')}
                options={BILLING_CYCLES}
                help="Optional."
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
