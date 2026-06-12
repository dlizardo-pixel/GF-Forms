import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TopBar, Progress, Step } from '../components/Layout.jsx';
import {
  TextField,
  NumberField,
  TextAreaField,
  MultiSelectField,
  ChoiceField,
  AutocompleteField,
  Hint,
} from '../components/Fields.jsx';
import PlzCity from '../components/PlzCity.jsx';
import { SK_COMPONENTS, INSTALLATION_STATUS } from '../lib/options.js';
import {
  HEAT_PUMP_MANUFACTURERS,
  PV_INVERTER_MANUFACTURERS,
  BATTERY_INVERTER_MANUFACTURERS,
} from '../../shared/manufacturers.js';
import { readPrefill } from '../lib/prefill.js';
import { submitForm } from '../lib/api.js';
import { COMPONENT_ICON } from '../lib/brandAssets.js';
import { loadDraft, saveDraft, clearDraft } from '../lib/draft.js';
import { scheduleCloudSave, getCloudId, clearCloudId } from '../lib/draftSync.js';
import { GF_CONTACT_EMAIL } from '../lib/config.js';
import MailListToast from '../components/MailListToast.jsx';

const DRAFT_KEY = 'gf-sektor-draft';

// Komponenten-Optionen mit Brand-Icons.
const COMPONENT_OPTIONS = SK_COMPONENTS.map((c) => ({ ...c, icon: COMPONENT_ICON[c.key] }));

/** Schalter „läuft schon / ist geplant" je gewählter Komponente. */
function StatusToggle({ value, onChange }) {
  return (
    <div className="gf-toggle" style={{ marginBottom: 12 }}>
      <button type="button" className={value === 'vorhanden' ? 'is-on' : ''} onClick={() => onChange('vorhanden')}>
        läuft schon
      </button>
      <button type="button" className={value === 'geplant' ? 'is-on' : ''} onClick={() => onChange('geplant')}>
        ist geplant
      </button>
    </div>
  );
}

export default function SektorkopplungForm() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const prefill = useMemo(() => readPrefill(search), [search]);
  const draft = useMemo(() => loadDraft(DRAFT_KEY), []);

  const [data, setData] = useState(
    draft?.data ?? {
      contactName: prefill.contactName,
      company: prefill.company,
      contactEmail: prefill.contactEmail,
      streetHeating: prefill.streetHeating,
      suppliedBuildings: '',
      plz: prefill.plz,
      city: prefill.city,
      lat: null,
      lng: null,
      residentialUnits: '',
      caretakerName: '',
      caretakerPhone: '',
      selectedComponents: [],
      componentStatus: {},
      components: {},
      installationStatus: '',
      installerPv: '',
      installerHeatPump: '',
      pvUsageConcept: '',
      internetProvision: '',
      accessCredentials: '',
      comment: '',
    },
  );
  const [restored, setRestored] = useState(!!draft);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    saveDraft(DRAFT_KEY, { data });
    const hasContent = !!(data.company || data.contactName || data.contactEmail || data.streetHeating);
    scheduleCloudSave(DRAFT_KEY, 'sektorkopplung', data, hasContent);
  }, [data]);

  const set = (key) => (val) => setData((d) => ({ ...d, [key]: val }));
  const patch = (partial) => setData((d) => ({ ...d, ...partial }));
  const setComp = (key) => (val) => setData((d) => ({ ...d, components: { ...d.components, [key]: val } }));
  const setStatus = (key) => (val) => setData((d) => ({ ...d, componentStatus: { ...d.componentStatus, [key]: val } }));

  const has = (key) => data.selectedComponents.includes(key);

  async function handleSubmit() {
    setErrors([]);
    setSubmitting(true);
    try {
      const res = await submitForm({
        type: 'sektorkopplung',
        ...data,
        privacyConsent: consent,
        draftId: getCloudId(DRAFT_KEY),
      });
      clearDraft(DRAFT_KEY);
      clearCloudId(DRAFT_KEY);
      navigate('/danke', { state: { mock: res.mock } });
    } catch (err) {
      setErrors(err.errors || [err.message]);
      setSubmitting(false);
    }
  }

  const mailtoHref =
    `mailto:${GF_CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent('Anlagenliste – ' + (data.company || 'Ihr Unternehmen'))}` +
    `&body=${encodeURIComponent(
      'Hallo,\n\nanbei unsere vorhandene Liste (Excel/PDF). Bitte melden Sie sich, wenn etwas fehlt.\n\nViele Grüße\n' +
        (data.contactName || ''),
    )}`;

  return (
    <div className="gf-page">
      <TopBar />
      <div className="gf-shell">
        <Progress percent={50} label="Wärmepumpe, Solar & Co. erfassen" />
        {restored && (
          <Hint kind="info">
            Willkommen zurück — wir haben Ihren letzten Stand wiederhergestellt.{' '}
            <button
              type="button"
              className="gf-btn gf-btn-text"
              style={{ padding: 0 }}
              onClick={() => {
                clearDraft(DRAFT_KEY);
                clearCloudId(DRAFT_KEY);
                window.location.reload();
              }}
            >
              Neu beginnen
            </button>
          </Hint>
        )}
        <AnimatePresence mode="wait">
          <Step stepKey="sk">
            <span className="gf-eyebrow">Wärmepumpe und/oder Solar</span>
            <h1 className="gf-step-title">Was steht bei Ihnen im Keller — und auf dem Dach?</h1>
            <p className="gf-step-sub">
              Wir blenden nur die Fragen ein, die zu Ihnen passen. Schätzen ist okay — den Rest klären wir
              gemeinsam.
            </p>
            <p className="gf-help">
              Ihre Eingaben werden automatisch und sicher (EU) zwischengespeichert, damit nichts verloren geht
              — und nach 30 Tagen automatisch gelöscht.
            </p>

            {/* ---- Standort & Kontakt ---- */}
            <h3 style={{ fontSize: 16 }}>Wer sind Sie, und wo steht die Anlage?</h3>
            <TextField label="Wie heißen Sie?" value={data.contactName} onChange={set('contactName')} />
            <TextField label="Für welches Unternehmen?" value={data.company} onChange={set('company')} />
            <TextField
              label="Ihre E-Mail"
              value={data.contactEmail}
              onChange={set('contactEmail')}
              type="email"
              required
              help="Hierhin schicken wir die Bestätigung — kein Newsletter."
            />
            <TextField label="Wo steht der Heizungskeller?" value={data.streetHeating} onChange={set('streetHeating')} required help="Adresse des Gebäudes mit der Anlage." />
            <TextField label="Versorgt die Anlage noch andere Häuser?" value={data.suppliedBuildings} onChange={set('suppliedBuildings')} help="Nur wenn ja — sonst überspringen." />
            <PlzCity plz={data.plz} city={data.city} onPatch={patch} />
            <NumberField label="Wie viele Wohnungen hängen dran?" value={data.residentialUnits} onChange={set('residentialUnits')} help="Grobe Zahl reicht." />
            <TextField label="Hauswart vor Ort — Name" value={data.caretakerName} onChange={set('caretakerName')} />
            <TextField label="Hauswart — Telefon" value={data.caretakerPhone} onChange={set('caretakerPhone')} />

            {/* ---- Komponenten-Auswahl ---- */}
            <h3 style={{ fontSize: 16, marginTop: 'var(--gf-space-8)' }}>Was ist da — oder ist geplant?</h3>
            <MultiSelectField
              label="Tippen Sie an, was bei Ihnen dabei ist:"
              value={data.selectedComponents}
              onChange={set('selectedComponents')}
              options={COMPONENT_OPTIONS}
              help="Mehrfachauswahl möglich. Pro Auswahl sagen Sie kurz, ob es schon läuft oder geplant ist."
            />

            {/* ---- Detailblöcke (nur für Gewähltes) ---- */}
            {has('waermepumpe') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Wärmepumpe</h3>
                <StatusToggle value={data.componentStatus.waermepumpe} onChange={setStatus('waermepumpe')} />
                <AutocompleteField
                  label="Welche Wärmepumpe ist das?"
                  value={data.components.heatPumpModel}
                  onChange={setComp('heatPumpModel')}
                  suggestions={HEAT_PUMP_MANUFACTURERS}
                  help="Hersteller und Modell, falls Sie's gerade zur Hand haben."
                />
                <div className="gf-row2">
                  <NumberField label="Wie viele?" value={data.components.heatPumpCount} onChange={setComp('heatPumpCount')} />
                  <NumberField label="Größe je Stück" value={data.components.heatPumpKw} onChange={setComp('heatPumpKw')} suffix="kW" />
                </div>
              </div>
            )}

            {has('pv') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Solaranlage (PV)</h3>
                <StatusToggle value={data.componentStatus.pv} onChange={setStatus('pv')} />
                <AutocompleteField
                  label="Welcher Wechselrichter?"
                  value={data.components.pvInverterModel}
                  onChange={setComp('pvInverterModel')}
                  suggestions={PV_INVERTER_MANUFACTURERS}
                  help="Hersteller und Modell, falls bekannt."
                />
                <div className="gf-row2">
                  <NumberField label="Wie viele Module/Stränge?" value={data.components.pvCount} onChange={setComp('pvCount')} />
                  <NumberField label="Größe gesamt" value={data.components.pvKwp} onChange={setComp('pvKwp')} suffix="kWp" />
                </div>
              </div>
            )}

            {has('batterie') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Batteriespeicher</h3>
                <StatusToggle value={data.componentStatus.batterie} onChange={setStatus('batterie')} />
                <AutocompleteField
                  label="Welcher Batterie-Wechselrichter?"
                  value={data.components.batteryInverterModel}
                  onChange={setComp('batteryInverterModel')}
                  suggestions={BATTERY_INVERTER_MANUFACTURERS}
                  help="Hersteller und Modell, falls bekannt."
                />
                <div className="gf-row2">
                  <NumberField label="Wie viele?" value={data.components.batteryCount} onChange={setComp('batteryCount')} />
                  <NumberField label="Größe gesamt" value={data.components.batteryKwh} onChange={setComp('batteryKwh')} suffix="kWh" />
                </div>
              </div>
            )}

            {has('pufferspeicher') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Pufferspeicher</h3>
                <StatusToggle value={data.componentStatus.pufferspeicher} onChange={setStatus('pufferspeicher')} />
                <div className="gf-row2">
                  <NumberField label="Wie viele?" value={data.components.bufferCount} onChange={setComp('bufferCount')} />
                  <NumberField label="Größe je Stück" value={data.components.bufferLiters} onChange={setComp('bufferLiters')} suffix="Liter" />
                </div>
              </div>
            )}

            {has('heizstab') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Heizstab</h3>
                <StatusToggle value={data.componentStatus.heizstab} onChange={setStatus('heizstab')} />
                <div className="gf-row2">
                  <NumberField label="Wie viele?" value={data.components.heatingRodCount} onChange={setComp('heatingRodCount')} />
                  <NumberField label="Größe je Stück" value={data.components.heatingRodKw} onChange={setComp('heatingRodKw')} suffix="kW" />
                </div>
              </div>
            )}

            {/* ---- Installation & Zugang ---- */}
            <h3 style={{ fontSize: 16, marginTop: 'var(--gf-space-8)' }}>Wie weit ist das Ganze?</h3>
            <ChoiceField label="Läuft es schon, oder ist es noch in Planung?" value={data.installationStatus} onChange={set('installationStatus')} options={INSTALLATION_STATUS} />
            <TextField label="Wer hat die Solaranlage gebaut?" value={data.installerPv} onChange={set('installerPv')} help="Installationsunternehmen, falls bekannt." />
            <TextField label="Wer hat die Wärmepumpe gebaut?" value={data.installerHeatPump} onChange={set('installerHeatPump')} help="Installationsunternehmen, falls bekannt." />
            <TextField label="Wofür wird der Solarstrom genutzt?" value={data.pvUsageConcept} onChange={set('pvUsageConcept')} help='z. B. „Allgemeinstrom + Wärmepumpe".' />
            <TextField label="Wie kommt das Internet zur Anlage?" value={data.internetProvision} onChange={set('internetProvision')} help="z. B. Router im Keller, Mobilfunk, LAN." />
            <TextField label="Zugangsdaten (WLAN-Name, Passwort)" value={data.accessCredentials} onChange={set('accessCredentials')} help="Optional — können Sie auch später nachreichen." />
            <TextAreaField label="Möchten Sie uns noch etwas sagen?" value={data.comment} onChange={set('comment')} />

            {/* ---- Datenschutz & Absenden ---- */}
            <div className="gf-consent">
              <input type="checkbox" id="consent-sk" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <label htmlFor="consent-sk">
                Ja, Green Fusion darf diese Angaben nutzen, um meine mögliche Ersparnis zu berechnen. Verschickt
                wird das über den EU-Dienst Brevo. Mehr passiert damit nicht.
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
              <button className="gf-btn gf-btn-ghost" onClick={() => navigate('/')}>
                ← Abbrechen
              </button>
              <button className="gf-btn gf-btn-primary" disabled={!consent || submitting} onClick={handleSubmit}>
                {submitting ? <span className="gf-spinner" /> : 'Absenden'}
              </button>
            </div>
          </Step>
        </AnimatePresence>
      </div>
      <MailListToast mailtoHref={mailtoHref} />
    </div>
  );
}
