import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TopBar, Progress, Step } from '../components/Layout.jsx';
import { TextField, Hint } from '../components/Fields.jsx';
import SiteEditor from '../components/sektor/SiteEditor.jsx';
import { makeSite, isSiteComplete } from '../lib/sektorModel.js';
import { readPrefill } from '../lib/prefill.js';
import { submitForm } from '../lib/api.js';
import { loadDraft, saveDraft, clearDraft } from '../lib/draft.js';
import { scheduleCloudSave, getCloudId, clearCloudId } from '../lib/draftSync.js';
import { GF_CONTACT_EMAIL } from '../lib/config.js';
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

  const defaultContact = {
    contactName: handoff?.contactName || prefill.contactName,
    company: handoff?.company || prefill.company,
    contactEmail: handoff?.contactEmail || prefill.contactEmail,
    contactPhone: '',
  };

  const [phase, setPhase] = useState(draft?.phase ?? 'contact'); // 'contact' | 'sites' | 'submit'
  const [contact, setContact] = useState(draft?.contact ?? defaultContact);
  const [sites, setSites] = useState(draft?.sites ?? [makeSite()]);
  const [current, setCurrent] = useState(draft?.current ?? 0);
  const [restored, setRestored] = useState(!!draft);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    saveDraft(DRAFT_KEY, { phase, contact, sites, current });
    const hasContent =
      !!(contact.company || contact.contactName || contact.contactEmail) || sites.some((s) => s.streetHeating || s.plz);
    scheduleCloudSave(DRAFT_KEY, 'sektorkopplung', { contact, sites }, hasContent);
  }, [phase, contact, sites, current]);

  const setContactField = (key) => (val) => setContact((c) => ({ ...c, [key]: val }));
  const updateSite = (index, partial) => setSites((arr) => arr.map((s, i) => (i === index ? { ...s, ...partial } : s)));
  const addSite = (fromPrev) =>
    setSites((arr) => {
      const next = [...arr, makeSite(fromPrev ? arr[arr.length - 1] : null)];
      return next;
    });
  const removeSite = (index) =>
    setSites((arr) => {
      const next = arr.filter((_, i) => i !== index);
      return next.length ? next : [makeSite()];
    });

  function startSites() {
    const errs = [];
    if (!contact.contactEmail.trim()) errs.push('Wir brauchen Ihre E-Mail, um Ihnen die Bestätigung zu schicken.');
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setPhase('sites');
  }

  function resetAll() {
    clearDraft(DRAFT_KEY);
    clearCloudId(DRAFT_KEY);
    setContact(defaultContact);
    setSites([makeSite()]);
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
  const mailtoHref =
    `mailto:${GF_CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent('Anlagenliste – ' + (contact.company || 'Ihr Unternehmen'))}` +
    `&body=${encodeURIComponent('Hallo,\n\nanbei unsere vorhandene Liste (Excel/PDF).\n\nViele Grüße\n' + (contact.contactName || ''))}`;

  return (
    <div className="gf-page">
      <TopBar />
      <div className="gf-shell">
        {phase === 'contact' && <Progress percent={5} label="Schritt 1: Ihre Kontaktdaten" />}
        {phase === 'sites' && <Progress percent={10 + (current / sites.length) * 80} label={`Anlage ${current + 1} von ${sites.length}`} />}
        {phase === 'submit' && <Progress percent={95} label="Letzter Schritt: Absenden" />}

        {both && (
          <Hint kind="info">
            <strong>Teil 2 von 2:</strong> Teil 1 (klassische Heizungen) ist abgeschickt — danke! Jetzt noch
            die Anlagen mit Wärmepumpe oder Solar.
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
                Diese Angaben gelten für alle Anlagen. Danach erfassen wir Ihre Anlagen — eine nach der anderen.
                Schätzen ist okay.
              </p>
              <p className="gf-help">
                Ihre Eingaben werden automatisch und sicher (EU) zwischengespeichert, damit nichts verloren geht —
                und nach 30 Tagen automatisch gelöscht.
              </p>

              <TextField label="Wie heißen Sie?" value={contact.contactName} onChange={setContactField('contactName')} />
              <TextField label="Für welches Unternehmen?" value={contact.company} onChange={setContactField('company')} />
              <TextField label="Ihre E-Mail" value={contact.contactEmail} onChange={setContactField('contactEmail')} type="email" required help="Hierhin schicken wir die Bestätigung — kein Newsletter." />
              <TextField label="Ihre Telefonnummer" value={contact.contactPhone} onChange={setContactField('contactPhone')} help="Für kurze Rückfragen. Optional." />

              {errors.length > 0 && <ErrorBox errors={errors} />}

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => navigate('/')}>← Abbrechen</button>
                <button className="gf-btn gf-btn-primary" onClick={startSites}>Weiter zu den Anlagen →</button>
              </div>
            </Step>
          )}

          {/* ===== Schritt 2: Anlagen (eine nach der anderen) ===== */}
          {phase === 'sites' && sites[current] && (
            <Step stepKey={`site-${current}`}>
              <span className="gf-eyebrow">Anlage {current + 1} von {sites.length}</span>
              <h1 className="gf-step-title" style={{ marginBottom: 16 }}>Erzählen Sie uns von dieser Anlage</h1>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {current > 0 && (
                  <button type="button" className="gf-btn gf-btn-ghost" onClick={() => updateSite(current, makeSite(sites[current - 1]))}>
                    ↧ Werte von letzter Anlage übernehmen
                  </button>
                )}
                {sites.length > 1 && (
                  <button type="button" className="gf-btn gf-btn-text" style={{ color: 'var(--gf-error)' }} onClick={() => { removeSite(current); setCurrent((c) => Math.max(0, c - 1)); }}>
                    ✕ Diese Anlage entfernen
                  </button>
                )}
              </div>

              <SiteEditor site={sites[current]} onChange={(partial) => updateSite(current, partial)} />

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => (current === 0 ? setPhase('contact') : setCurrent((c) => c - 1))}>
                  ← Zurück
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="gf-btn gf-btn-ghost" onClick={() => { addSite(false); setCurrent(sites.length); }}>
                    + Weitere Anlage
                  </button>
                  {current < sites.length - 1 ? (
                    <button className="gf-btn gf-btn-primary" onClick={() => setCurrent((c) => c + 1)}>Nächste Anlage →</button>
                  ) : (
                    <button className="gf-btn gf-btn-primary" onClick={() => setPhase('submit')}>Weiter zur Übersicht →</button>
                  )}
                </div>
              </div>
            </Step>
          )}

          {/* ===== Schritt 3: Absenden ===== */}
          {phase === 'submit' && (
            <Step stepKey="submit">
              <span className="gf-eyebrow">Fast geschafft</span>
              <h1 className="gf-step-title">Kurz drübergeschaut — dann ab zu uns</h1>
              <p className="gf-step-sub">{completedCount} von {sites.length} Anlagen sind vollständig (Adresse).</p>

              {completedCount < sites.length && (
                <Hint kind="soft">Bei {sites.length - completedCount} Anlage(n) fehlt noch die Adresse. Gehen Sie einfach nochmal zurück.</Hint>
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
