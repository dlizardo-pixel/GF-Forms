import { useMemo, useState } from 'react';
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

// Ab wie vielen Anlagen wird in den kompakten Tabellenmodus gewechselt?
const GUIDED_MAX = 10;

export default function StandardForm() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const prefill = useMemo(() => readPrefill(search), [search]);

  // phase: 'project' → 'systems' → 'submit'
  const [phase, setPhase] = useState('project');
  const [project, setProject] = useState({
    contactName: prefill.contactName,
    contactRole: prefill.contactRole,
    company: prefill.company,
    contactEmail: prefill.contactEmail,
    systemCount: prefill.systemCount || '',
    defaultEnergyType: prefill.defaultEnergyType || '(keine Vorgabe)',
    billingCycle: prefill.billingCycle || '(keine Angabe)',
  });
  const [systems, setSystems] = useState([]);
  const [current, setCurrent] = useState(0);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const count = Math.max(1, Math.min(parseInt(project.systemCount, 10) || 1, 500));
  const mode = count > GUIDED_MAX ? 'grid' : 'guided';

  const setProjectField = (key) => (val) => setProject((p) => ({ ...p, [key]: val }));

  // ---- Projektebene abschließen → Anlagen erzeugen ----
  function startSystems() {
    const errs = [];
    if (!project.contactName.trim()) errs.push('Bitte den Namen des Ansprechpartners angeben.');
    if (!project.company.trim()) errs.push('Bitte das Unternehmen angeben.');
    if (!project.contactEmail.trim()) errs.push('Bitte die E-Mail des Ansprechpartners angeben.');
    if (!project.systemCount || parseInt(project.systemCount, 10) < 1) errs.push('Bitte die Anzahl der Anlagen angeben.');
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    // Anlagen-Array auf die gewünschte Anzahl bringen (mit Projekt-Vorgaben).
    const arr = [];
    for (let i = 0; i < count; i++) arr.push(systems[i] || makeSystem(project));
    setSystems(arr);
    setCurrent(0);
    setPhase('systems');
  }

  const updateSystem = (index, partial) =>
    setSystems((arr) => arr.map((s, i) => (i === index ? { ...s, ...partial } : s)));

  // "Werte von letzter Anlage übernehmen"
  const copyFromPrevious = (index) =>
    setSystems((arr) => arr.map((s, i) => (i === index ? makeSystem(project, arr[index - 1]) : s)));

  // ---- Absenden ----
  async function handleSubmit() {
    setErrors([]);
    setSubmitting(true);
    try {
      const res = await submitForm({ type: 'standard', project, systems, privacyConsent: consent });
      navigate('/danke', { state: { mock: res.mock } });
    } catch (err) {
      setErrors(err.errors || [err.message]);
      setSubmitting(false);
    }
  }

  const completedCount = systems.filter(isSystemComplete).length;

  return (
    <div className="gf-page">
      <TopBar />
      <div className="gf-shell">
        {phase === 'project' && <Progress percent={5} label="Schritt 1: Ihre Projektdaten" />}
        {phase === 'systems' && mode === 'guided' && (
          <Progress percent={10 + (current / count) * 80} label={`Anlage ${current + 1} von ${count}`} />
        )}
        {phase === 'systems' && mode === 'grid' && (
          <Progress percent={10 + (completedCount / count) * 80} label={`${completedCount} von ${count} Anlagen vollständig`} />
        )}
        {phase === 'submit' && <Progress percent={95} label="Letzter Schritt: Absenden" />}

        <AnimatePresence mode="wait">
          {/* ============ PHASE 1: PROJEKT ============ */}
          {phase === 'project' && (
            <Step stepKey="project">
              <span className="gf-eyebrow">Standard Business Case</span>
              <h1 className="gf-step-title">Erst ein paar Angaben zu Ihnen</h1>
              <p className="gf-step-sub">
                Diese Angaben gelten für alle Anlagen. Vorgaben können Sie später je Anlage anpassen.
              </p>

              <TextField label="Ansprechpartner – Name" value={project.contactName} onChange={setProjectField('contactName')} required />
              <TextField label="Rolle / Funktion" value={project.contactRole} onChange={setProjectField('contactRole')} />
              <TextField label="Unternehmen" value={project.company} onChange={setProjectField('company')} required />
              <TextField
                label="E-Mail des Ansprechpartners"
                value={project.contactEmail}
                onChange={setProjectField('contactEmail')}
                required
                type="email"
                help="An diese Adresse senden wir die Bestätigung."
              />
              <NumberField
                label="Anzahl Anlagen"
                value={project.systemCount}
                onChange={setProjectField('systemCount')}
                required
                min={1}
                help={`Bei mehr als ${GUIDED_MAX} Anlagen wechseln wir in einen kompakten Tabellenmodus.`}
              />
              <SelectField
                label="Vorgabe Energieträger für alle Anlagen"
                value={project.defaultEnergyType}
                onChange={setProjectField('defaultEnergyType')}
                options={ENERGY_TYPE_OPTIONS}
                help="Optional – wird pro Anlage vorbelegt und ist dort änderbar."
              />
              <SelectField
                label="Abrechnungsturnus"
                value={project.billingCycle}
                onChange={setProjectField('billingCycle')}
                options={BILLING_CYCLES}
                help="Optional."
              />

              {errors.length > 0 && (
                <Hint kind="error">
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </Hint>
              )}

              <div className="gf-actions">
                <span />
                <button className="gf-btn gf-btn-primary" onClick={startSystems}>
                  Weiter zu den Anlagen →
                </button>
              </div>
            </Step>
          )}

          {/* ============ PHASE 2: ANLAGEN ============ */}
          {phase === 'systems' && mode === 'guided' && systems[current] && (
            <Step stepKey={`system-${current}`}>
              <span className="gf-eyebrow">
                Anlage {current + 1} von {count}
              </span>
              <h1 className="gf-step-title" style={{ marginBottom: 16 }}>Angaben zur Anlage</h1>

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
                    Zur Übersicht →
                  </button>
                )}
              </div>
            </Step>
          )}

          {phase === 'systems' && mode === 'grid' && (
            <Step stepKey="grid">
              <span className="gf-eyebrow">{count} Anlagen</span>
              <h1 className="gf-step-title">Anlagen zeilenweise erfassen</h1>
              <p className="gf-step-sub">
                Geben Sie jede Anlage in einer Zeile ein. Mit „↧ übernehmen" kopieren Sie die Werte der
                vorigen Zeile (praktisch bei ähnlichen Gebäuden).
              </p>

              <SystemGrid systems={systems} updateSystem={updateSystem} copyFromPrevious={copyFromPrevious} />

              <div className="gf-actions">
                <button className="gf-btn gf-btn-ghost" onClick={() => setPhase('project')}>
                  ← Zurück
                </button>
                <button className="gf-btn gf-btn-primary" onClick={() => setPhase('submit')}>
                  Zur Übersicht →
                </button>
              </div>
            </Step>
          )}

          {/* ============ PHASE 3: ABSENDEN ============ */}
          {phase === 'submit' && (
            <Step stepKey="submit">
              <span className="gf-eyebrow">Fast geschafft</span>
              <h1 className="gf-step-title">Übersicht &amp; Absenden</h1>
              <p className="gf-step-sub">
                {completedCount} von {count} Anlagen sind vollständig ausgefüllt.
              </p>

              {completedCount < count && (
                <Hint kind="soft">
                  Es fehlen noch Pflichtangaben bei {count - completedCount} Anlage(n). Sie können trotzdem
                  zurückgehen und ergänzen – beim Absenden prüfen wir die Vollständigkeit.
                </Hint>
              )}

              <div className="gf-consent">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <label htmlFor="consent">
                  Ich bin damit einverstanden, dass Green Fusion die angegebenen Daten zur Erstellung einer
                  Wirtschaftlichkeitsanalyse verarbeitet. Der Versand erfolgt über den EU-Dienst Brevo.
                </label>
              </div>

              {errors.length > 0 && (
                <Hint kind="error">
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </Hint>
              )}

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
    </div>
  );
}
