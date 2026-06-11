import { useMemo, useState } from 'react';
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

// Komponenten-Optionen mit Brand-Icons.
const COMPONENT_OPTIONS = SK_COMPONENTS.map((c) => ({ ...c, icon: COMPONENT_ICON[c.key] }));

/** Schalter „vorhanden / geplant" je gewählter Komponente. */
function StatusToggle({ value, onChange }) {
  return (
    <div className="gf-toggle" style={{ marginBottom: 12 }}>
      <button type="button" className={value === 'vorhanden' ? 'is-on' : ''} onClick={() => onChange('vorhanden')}>
        vorhanden
      </button>
      <button type="button" className={value === 'geplant' ? 'is-on' : ''} onClick={() => onChange('geplant')}>
        geplant
      </button>
    </div>
  );
}

export default function SektorkopplungForm() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const prefill = useMemo(() => readPrefill(search), [search]);

  const [data, setData] = useState({
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
  });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const set = (key) => (val) => setData((d) => ({ ...d, [key]: val }));
  const patch = (partial) => setData((d) => ({ ...d, ...partial }));
  const setComp = (key) => (val) => setData((d) => ({ ...d, components: { ...d.components, [key]: val } }));
  const setStatus = (key) => (val) => setData((d) => ({ ...d, componentStatus: { ...d.componentStatus, [key]: val } }));

  const has = (key) => data.selectedComponents.includes(key);

  async function handleSubmit() {
    setErrors([]);
    setSubmitting(true);
    try {
      const res = await submitForm({ type: 'sektorkopplung', ...data, privacyConsent: consent });
      navigate('/danke', { state: { mock: res.mock } });
    } catch (err) {
      setErrors(err.errors || [err.message]);
      setSubmitting(false);
    }
  }

  return (
    <div className="gf-page">
      <TopBar />
      <div className="gf-shell">
        <Progress percent={50} label="Sektorkopplung – Erfassung Ihrer Anlage" />
        <AnimatePresence mode="wait">
          <Step stepKey="sk">
            <span className="gf-eyebrow">Sektorkopplung</span>
            <h1 className="gf-step-title">Wärmepumpe, PV &amp; Speicher erfassen</h1>
            <p className="gf-step-sub">Wir blenden nur die Detailfragen ein, die zu Ihren Komponenten passen.</p>

            {/* ---- Standort & Kontakt ---- */}
            <h3 className="gf-step-title" style={{ fontSize: 20 }}>Standort &amp; Kontakt</h3>
            <TextField label="Ansprechpartner – Name" value={data.contactName} onChange={set('contactName')} />
            <TextField label="Unternehmen" value={data.company} onChange={set('company')} />
            <TextField
              label="E-Mail des Ansprechpartners"
              value={data.contactEmail}
              onChange={set('contactEmail')}
              type="email"
              required
              help="An diese Adresse senden wir die Bestätigung."
            />
            <TextField label="Straße & Hausnummer der Heizungsanlage" value={data.streetHeating} onChange={set('streetHeating')} required />
            <TextField label="Versorgte Gebäude (falls abweichend)" value={data.suppliedBuildings} onChange={set('suppliedBuildings')} />
            <PlzCity plz={data.plz} city={data.city} onPatch={patch} />
            <NumberField label="Anzahl Wohneinheiten" value={data.residentialUnits} onChange={set('residentialUnits')} />
            <TextField label="Hauswart – Name" value={data.caretakerName} onChange={set('caretakerName')} />
            <TextField label="Hauswart – Telefon" value={data.caretakerPhone} onChange={set('caretakerPhone')} />

            {/* ---- Komponenten-Auswahl ---- */}
            <h3 className="gf-step-title" style={{ fontSize: 20, marginTop: 24 }}>Vorhandene / geplante Komponenten</h3>
            <MultiSelectField
              label="Welche Komponenten gibt es (oder sind geplant)?"
              value={data.selectedComponents}
              onChange={set('selectedComponents')}
              options={COMPONENT_OPTIONS}
              help="Mehrfachauswahl möglich."
            />

            {/* ---- Detailblöcke (nur für Gewähltes) ---- */}
            {has('waermepumpe') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Wärmepumpe</h3>
                <StatusToggle value={data.componentStatus.waermepumpe} onChange={setStatus('waermepumpe')} />
                <AutocompleteField label="Hersteller & Modell" value={data.components.heatPumpModel} onChange={setComp('heatPumpModel')} suggestions={HEAT_PUMP_MANUFACTURERS} />
                <div className="gf-row2">
                  <NumberField label="Anzahl" value={data.components.heatPumpCount} onChange={setComp('heatPumpCount')} />
                  <NumberField label="Größe" value={data.components.heatPumpKw} onChange={setComp('heatPumpKw')} suffix="kW" />
                </div>
              </div>
            )}

            {has('heizstab') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Heizstab</h3>
                <StatusToggle value={data.componentStatus.heizstab} onChange={setStatus('heizstab')} />
                <div className="gf-row2">
                  <NumberField label="Anzahl" value={data.components.heatingRodCount} onChange={setComp('heatingRodCount')} />
                  <NumberField label="Größe" value={data.components.heatingRodKw} onChange={setComp('heatingRodKw')} suffix="kW" />
                </div>
              </div>
            )}

            {has('pufferspeicher') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Pufferspeicher</h3>
                <StatusToggle value={data.componentStatus.pufferspeicher} onChange={setStatus('pufferspeicher')} />
                <div className="gf-row2">
                  <NumberField label="Anzahl" value={data.components.bufferCount} onChange={setComp('bufferCount')} />
                  <NumberField label="Größe" value={data.components.bufferLiters} onChange={setComp('bufferLiters')} suffix="Liter" />
                </div>
              </div>
            )}

            {has('pv') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>PV-Anlage</h3>
                <StatusToggle value={data.componentStatus.pv} onChange={setStatus('pv')} />
                <AutocompleteField label="PV-Wechselrichter – Hersteller & Modell" value={data.components.pvInverterModel} onChange={setComp('pvInverterModel')} suggestions={PV_INVERTER_MANUFACTURERS} />
                <div className="gf-row2">
                  <NumberField label="Anzahl" value={data.components.pvCount} onChange={setComp('pvCount')} />
                  <NumberField label="Größe" value={data.components.pvKwp} onChange={setComp('pvKwp')} suffix="kWp" />
                </div>
              </div>
            )}

            {has('batterie') && (
              <div className="gf-card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginTop: 0 }}>Batteriespeicher</h3>
                <StatusToggle value={data.componentStatus.batterie} onChange={setStatus('batterie')} />
                <AutocompleteField label="Batterie-Wechselrichter – Hersteller & Modell" value={data.components.batteryInverterModel} onChange={setComp('batteryInverterModel')} suggestions={BATTERY_INVERTER_MANUFACTURERS} />
                <div className="gf-row2">
                  <NumberField label="Anzahl" value={data.components.batteryCount} onChange={setComp('batteryCount')} />
                  <NumberField label="Größe" value={data.components.batteryKwh} onChange={setComp('batteryKwh')} suffix="kWh" />
                </div>
              </div>
            )}

            {/* ---- Installation & Zugang ---- */}
            <h3 className="gf-step-title" style={{ fontSize: 20, marginTop: 24 }}>Installation &amp; Zugang</h3>
            <ChoiceField label="Freigabe zur Installation / Status" value={data.installationStatus} onChange={set('installationStatus')} options={INSTALLATION_STATUS} />
            <TextField label="Installationsunternehmen PV" value={data.installerPv} onChange={set('installerPv')} />
            <TextField label="Installationsunternehmen Wärmepumpe" value={data.installerHeatPump} onChange={set('installerHeatPump')} />
            <TextField label="PV-Nutzungskonzept" value={data.pvUsageConcept} onChange={set('pvUsageConcept')} help='z. B. „Allgemeinstrom + Wärmepumpe"' />
            <TextField label="Wie wird Internet bereitgestellt?" value={data.internetProvision} onChange={set('internetProvision')} />
            <TextField label="Zugangsdaten (SSID, Passwort)" value={data.accessCredentials} onChange={set('accessCredentials')} />
            <TextAreaField label="Kommentar" value={data.comment} onChange={set('comment')} />

            {/* ---- Datenschutz & Absenden ---- */}
            <div className="gf-consent">
              <input type="checkbox" id="consent-sk" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <label htmlFor="consent-sk">
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
    </div>
  );
}
