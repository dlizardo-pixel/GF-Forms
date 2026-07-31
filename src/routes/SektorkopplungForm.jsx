import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TopBar, Progress, Step } from '../components/Layout.jsx';
import { TextField, NumberField, Hint } from '../components/Fields.jsx';
import SiteEditor from '../components/sektor/SiteEditor.jsx';
import SektorGrid from '../components/sektor/SektorGrid.jsx';
import { makeSite, isSiteComplete, normalizeSite } from '../lib/sektorModel.js';
import { readPrefill, readEncodedPrefill } from '../lib/prefill.js';
import { submitForm } from '../lib/api.js';
import { loadDraft, saveDraft, clearDraft } from '../lib/draft.js';
import { scheduleCloudSave, getCloudId, clearCloudId } from '../lib/draftSync.js';
import { GF_CONTACT_EMAIL, SEKTOR_GUIDED_MAX } from '../lib/config.js';
import MailListToast from '../components/MailListToast.jsx';

// v2: anderes Datenmodell (Ansprechpartner + mehrere Anlagen) → alter Entwurf wird ignoriert.
const DRAFT_KEY = 'gf-sektor-draft-v2';

export default function SektorkopplungForm() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const prefill = useMemo(() => readPrefill(search), [search]);
  const draft = useMemo(() => loadDraft(DRAFT_KEY), []);
  // „Beides"-Modus: kommt aus dem klassischen Formular; Kontakt wird übernommen.
  const both = useMemo(() => new URLSearchParams(search).get('both') === '1', [search]);
  const handoff = useMemo(() => {
    if (!both) return null;
    try {
      return JSON.parse(sessionStorage.getItem('gf-both-contact') || 'null');
    } catch {
      return null;
    }
  }, [both]);

  // Vorausgefüllter Link von Green Fusion: lang (?prefill=<base64>, alles in der
  // URL) oder kurz (?p=<id>, Daten liegen in D1). Der Kunde ergänzt nur noch,
  // was fehlt (z. B. Regler der Wärmepumpe).
  const encoded = useMemo(() => readEncodedPrefill(search), [search]);

  const defaultContact = {
    contactName: handoff?.contactName || encoded?.contact?.contactName || prefill.contactName,
    company: handoff?.company || encoded?.contact?.company || prefill.company,
    contactEmail: handoff?.contactEmail || encoded?.contact?.contactEmail || prefill.contactEmail,
    contactPhone: encoded?.contact?.contactPhone || '',
  };

  // Anlagen aus dem langen Prefill-Link (leer = eine leere Anlage).
  const initialSites = Array.isArray(encoded?.sites) && encoded.sites.length ? encoded.sites : [makeSite()];

  // Kurzlink (?p=<id>): vorbereiteter/erneut geöffneter Datensatz aus D1.
  const shortId = useMemo(() => new URLSearchParams(search).get('p') || '', [search]);

  // Steht die E-Mail schon im Link, kann der Kunde direkt bei den Anlagen anfangen.
  const [phase, setPhase] = useState(draft?.phase ?? (encoded?.contact?.contactEmail ? 'sites' : 'contact')); // 'contact' | 'sites' | 'submit'
  const [contact, setContact] = useState(draft?.contact ?? defaultContact);
  // Entwürfe können aus einer älteren Version stammen (eine WP in `components`)
  // → beim Wiederherstellen auf das aktuelle Modell bringen.
  const [sites, setSites] = useState(() => (draft?.sites ?? initialSites).map(normalizeSite));
  const [siteCount, setSiteCount] = useState(
    draft?.siteCount ?? String((Array.isArray(encoded?.sites) && encoded.sites.length) || 1),
  ); // vorab abgefragte Anzahl Anlagen
  const [current, setCurrent] = useState(draft?.current ?? 0);
  const [restored, setRestored] = useState(!!draft);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [isPrefill, setIsPrefill] = useState(!!encoded && !draft);
  const [prefillLoading, setPrefillLoading] = useState(!!shortId && !draft);

  // Kurzlink: Daten vom Server holen und anwenden (nur wenn kein Entwurf existiert).
  useEffect(() => {
    if (!shortId || draft) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/prefill?id=' + encodeURIComponent(shortId));
        const body = await res.json().catch(() => ({}));
        if (!cancelled && body.ok && body.payload) {
          const pl = body.payload;
          const c = pl.contact || {};
          setContact({
            contactName: c.contactName || '',
            company: c.company || '',
            contactEmail: c.contactEmail || '',
            contactPhone: c.contactPhone || '',
          });
          if (Array.isArray(pl.sites) && pl.sites.length) {
            setSites(pl.sites.map(normalizeSite));
            setSiteCount(String(pl.sites.length));
            setIsPrefill(true);
          }
          if (c.contactEmail) setPhase('sites');
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

  useEffect(() => {
    saveDraft(DRAFT_KEY, { phase, contact, sites, siteCount, current });
    const hasContent =
      !!(contact.company || contact.contactName || contact.contactEmail) || sites.some((s) => s.streetHeating || s.plz);
    scheduleCloudSave(DRAFT_KEY, 'sektorkopplung', { contact, sites }, hasContent);
  }, [phase, contact, sites, siteCount, current]);

  // Anzahl Anlagen und Darstellung (geführt vs. Tabelle) aus der Vorab-Angabe ableiten.
  const count = Math.max(1, Math.min(parseInt(siteCount, 10) || 1, 1000));
  const mode = count > SEKTOR_GUIDED_MAX ? 'grid' : 'guided';

  const setContactField = (key) => (val) => setContact((c) => ({ ...c, [key]: val }));
  const updateSite = (index, partial) => setSites((arr) => arr.map((s, i) => (i === index ? { ...s, ...partial } : s)));
  // „Werte von letzter Anlage übernehmen" (ohne Adresse) im geführten Modus.
  const copyFromPrevious = (index) =>
    setSites((arr) => arr.map((s, i) => (i === index ? makeSite(arr[index - 1]) : s)));

  function startSites() {
    const errs = [];
    if (!contact.contactEmail.trim()) errs.push('Wir brauchen Ihre E-Mail, um Ihnen die Bestätigung zu schicken.');
    if (!siteCount || parseInt(siteCount, 10) < 1) errs.push('Wie viele Anlagen möchten Sie erfassen?');
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    // Anlagen-Liste auf die gewählte Anzahl bringen (vorhandene behalten).
    setSites((arr) => {
      const out = [];
      for (let i = 0; i < count; i++) out.push(arr[i] || makeSite());
      return out;
    });
    setCurrent(0);
    setPhase('sites');
  }

  function resetAll() {
    clearDraft(DRAFT_KEY);
    clearCloudId(DRAFT_KEY);
    setContact(defaultContact);
    setSites([makeSite()]);
    setSiteCount('1');
    setCurrent(0);
    setConsent(false);
    setPhase('contact');
    setRestored(false);
    setErrors([]);
  }

  async function handleSubmit() {
    setErrors([]);
    setSubmitting(true);
    try {
      const res = await submitForm({
        type: 'sektorkopplung',
        contact,
        sites,
        privacyConsent: consent,
        draftId: getCloudId(DRAFT_KEY),
      });
      clearDraft(DRAFT_KEY);
      clearCloudId(DRAFT_KEY);
      sessionStorage.removeItem('gf-both-contact');
      navigate('/danke', { state: { mock: res.mock } });
    } catch (err) {
      setErrors(err.errors || [err.message]);
      setSubmitting(false);
    }
  }

  const completedCount = sites.filter(isSiteComplete).length;
  // Im Tabellenmodus können Zeilen hinzukommen – dann zählt die tatsächliche Zeilenzahl.
  const totalCount = mode === 'grid' ? sites.length || count : count;
  const mailtoHref =
    `mailto:${GF_CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent('Anlagenliste – ' + (contact.company || 'Ihr Unternehmen'))}` +
    `&body=${encodeURIComponent('Hallo,\n\nanbei unsere vorhandene Liste (Excel/PDF).\n\nViele Grüße\n' + (contact.contactName || ''))}`;

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

  const wideShell = phase === 'sites' && mode === 'grid';

  return (
    <div className="gf-page">
      <TopBar />
      <div className={'gf-shell' + (wideShell ? ' gf-shell-wide' : '')}>
        {phase === 'contact' && <Progress percent={5} label="Schritt 1: Ihre Kontaktdaten" />}
        {phase === 'sites' && mode === 'guided' && (
          <Progress
            percent={10 + (current / count) * 80}
            label={count > 1 ? `Anlage ${current + 1} von ${count}` : 'Ihre Anlage'}
          />
        )}
        {phase === 'sites' && mode === 'grid' && (
          <Progress
            percent={10 + (completedCount / Math.max(1, totalCount)) * 80}
            label={`${completedCount} von ${totalCount} Anlagen vollständig`}
          />
        )}
        {phase === 'submit' && <Progress percent={95} label="Letzter Schritt: Absenden" />}

        {both && (
          <Hint kind="info">
            <strong>Teil 2 von 2:</strong> Teil 1 (klassische Heizungen) ist abgeschickt — danke! Jetzt noch
            die Anlagen mit Wärmepumpe oder Solar.
          </Hint>
        )}

        {isPrefill && !restored && (
          <Hint kind="info">
            <strong>Wir haben Ihre Anlagen für Sie vorbereitet.</strong> Bitte schauen Sie kurz drüber und
            ergänzen, was noch fehlt — vor allem den Regler/Controller der Wärmepumpen.
          </Hint>
        )}

        {restored && (
          <Hint kind="info">
            Willkommen zurück — wir haben Ihren letzten Stand wiederhergestellt.{' '}
            <button type="button" className="gf-btn gf-btn-text" style={{ padding: 0 }} onClick={resetAll}>
              Neu beginnen
            </button>
          </Hint>
        )}

        <AnimatePresence mode="wait">
          {/* ===== Schritt 1: Ansprechpartner ===== */}
          {phase === 'contact' && (
            <Step stepKey="contact">
              <span className="gf-eyebrow">Wärmepumpe und/oder Solar</span>
              <h1 className="gf-step-title">Erst kurz zu Ihnen</h1>
              <p className="gf-step-sub">
                Diese Angaben gelten für alle Anlagen. Danach erfassen wir Ihre Anlagen. Schätzen ist okay.
              </p>
              <p className="gf-help">
                Ihre Eingaben werden automatisch und sicher (EU) zwischengespeichert, damit nichts verloren geht —
                und nach 30 Tagen automatisch gelöscht.
              </p>

              <TextField label="Wie heißen Sie?" value={contact.contactName} onChange={setContactField('contactName')} />
              <TextField label="Unternehmensname" value={contact.company} onChange={setContactField('company')} />
              <TextField label="Ihre E-Mail" value={contact.contactEmail} onChange={setContactField('contactEmail')} type="email" required help="Hierhin schicken wir die Bestätigung — kein Newsletter." />
              <TextField label="Ihre Telefonnummer" value={contact.contactPhone} onChange={setContactField('contactPhone')} help="Für kurze Rückfragen. Optional." />
              <NumberField
                label="Wie viele Anlagen möchten Sie erfassen?"
                value={siteCount}
                onChange={setSiteCount}
                required
                min={1}
                help={`Bis ${SEKTOR_GUIDED_MAX} gehen wir gemeinsam Anlage für Anlage durch, ab ${SEKTOR_GUIDED_MAX + 1} bekommen Sie eine Tabelle wie in Excel.`}
              />

              {errors.length > 0 && <ErrorBox errors={errors} />}

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => navigate('/')}>← Abbrechen</button>
                <button className="gf-btn gf-btn-primary" onClick={startSites}>Weiter zu den Anlagen →</button>
              </div>
            </Step>
          )}

          {/* ===== Schritt 2a: Anlagen geführt (1–2 Anlagen) ===== */}
          {phase === 'sites' && mode === 'guided' && sites[current] && (
            <Step stepKey={`site-${current}`}>
              <span className="gf-eyebrow">{count > 1 ? `Anlage ${current + 1} von ${count}` : 'Ihre Anlage'}</span>
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

              <SiteEditor site={sites[current]} onChange={(partial) => updateSite(current, partial)} />

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => (current === 0 ? setPhase('contact') : setCurrent((c) => c - 1))}>
                  ← Zurück
                </button>
                {current < count - 1 ? (
                  <button className="gf-btn gf-btn-primary" onClick={() => setCurrent((c) => c + 1)}>Nächste Anlage →</button>
                ) : (
                  <button className="gf-btn gf-btn-primary" onClick={() => setPhase('submit')}>Weiter zur Übersicht →</button>
                )}
              </div>
            </Step>
          )}

          {/* ===== Schritt 2b: Anlagen als Tabelle (ab 3 Anlagen) ===== */}
          {phase === 'sites' && mode === 'grid' && (
            <Step stepKey="grid">
              <span className="gf-eyebrow">Ihre Anlagen</span>
              <h1 className="gf-step-title">Tragen Sie Ihre Anlagen ein</h1>
              <p className="gf-step-sub">
                Eine Zeile pro Anlage — wie in Ihrer Excel-Liste. Die fachlichen Details je Anlage öffnen Sie
                über „Details". Schätzen ist überall okay.
              </p>

              <SektorGrid sites={sites} setSites={setSites} />

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => setPhase('contact')}>← Zurück</button>
                <button className="gf-btn gf-btn-primary" onClick={() => setPhase('submit')}>Weiter zur Übersicht →</button>
              </div>
            </Step>
          )}

          {/* ===== Schritt 3: Absenden ===== */}
          {phase === 'submit' && (
            <Step stepKey="submit">
              <span className="gf-eyebrow">Fast geschafft</span>
              <h1 className="gf-step-title">Kurz drübergeschaut — dann ab zu uns</h1>
              <p className="gf-step-sub">{completedCount} von {totalCount} Anlagen sind vollständig (Adresse).</p>

              {completedCount < totalCount && (
                <Hint kind="soft">Bei {totalCount - completedCount} Anlage(n) fehlt noch die Adresse. Gehen Sie einfach nochmal zurück.</Hint>
              )}

              <div className="gf-consent">
                <input type="checkbox" id="consent-sk" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <label htmlFor="consent-sk">
                  Ja, Green Fusion darf diese Angaben nutzen, um meine mögliche Ersparnis zu berechnen. Verschickt
                  wird das über den EU-Dienst Brevo. Mehr passiert damit nicht.
                </label>
              </div>

              {errors.length > 0 && <ErrorBox errors={errors} />}

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => setPhase('sites')}>← Zurück</button>
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
