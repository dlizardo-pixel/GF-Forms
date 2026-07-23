import {
  TextField,
  NumberField,
  TextAreaField,
  MultiSelectField,
  ChoiceField,
  ToggleField,
  AutocompleteField,
  Hint,
} from '../Fields.jsx';
import PlzCity from '../PlzCity.jsx';
import {
  SK_COMPONENTS,
  WP_TOPOLOGY,
  PV_USAGE,
  PV_OPERATOR,
  SITE_ACCESS,
  PLANNING_HORIZON,
  OTHER_HEAT_SOURCES,
} from '../../lib/options.js';
import {
  HEAT_PUMP_MANUFACTURERS,
  PV_INVERTER_MANUFACTURERS,
  BATTERY_INVERTER_MANUFACTURERS,
} from '../../../shared/manufacturers.js';
import { COMPONENT_ICON } from '../../lib/brandAssets.js';
import { siteHasPlanned } from '../../lib/sektorModel.js';

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

/**
 * Editor für EINE Sektorkopplungs-Anlage. Enthält neben Standort & Komponenten
 * die fachlich entscheidenden Fragen (Regler/Controller, Topologie, EMS/GLT +
 * Modbus, PV-Nutzung/Betreiber/Zugriff, weitere Wärmeerzeuger) – diese trennen
 * grün/gelb/rot bei der Anbindbarkeit.
 */
export default function SiteEditor({ site, onChange, hideLocation = false }) {
  const set = (key) => (val) => onChange({ [key]: val });
  const patch = (partial) => onChange(partial);
  const setComp = (key) => (val) => onChange({ components: { ...site.components, [key]: val } });
  const setStatus = (key) => (val) => onChange({ componentStatus: { ...site.componentStatus, [key]: val } });
  const has = (key) => site.selectedComponents.includes(key);

  return (
    <div>
      {/* ---- Standort (im Tabellenmodus stehen diese Felder schon in der Zeile) ---- */}
      {!hideLocation && (
        <>
          <h3 style={{ fontSize: 16 }}>Wo steht diese Anlage?</h3>
          <TextField label="Wo steht der Heizungskeller?" value={site.streetHeating} onChange={set('streetHeating')} required help="Adresse des Gebäudes mit der Anlage." />
          <TextField label="Versorgt die Anlage noch andere Häuser?" value={site.suppliedBuildings} onChange={set('suppliedBuildings')} help="Nur wenn ja — sonst überspringen." />
          <PlzCity plz={site.plz} city={site.city} onPatch={patch} />
          <NumberField label="Wie viele Wohnungen hängen dran?" value={site.residentialUnits} onChange={set('residentialUnits')} help="Grobe Zahl reicht." />
        </>
      )}

      {/* ---- Komponenten ---- */}
      <h3 style={{ fontSize: 16, marginTop: 'var(--gf-space-8)' }}>Was ist da — oder ist geplant?</h3>
      <MultiSelectField
        label="Tippen Sie an, was bei dieser Anlage dabei ist:"
        value={site.selectedComponents}
        onChange={set('selectedComponents')}
        options={COMPONENT_OPTIONS}
        help="Mehrfachauswahl. Pro Auswahl sagen Sie kurz, ob es schon läuft oder geplant ist."
      />

      {has('waermepumpe') && (
        <div className="gf-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Wärmepumpe</h3>
          <StatusToggle value={site.componentStatus.waermepumpe} onChange={setStatus('waermepumpe')} />
          <AutocompleteField label="Hersteller & Modell der Wärmepumpe" value={site.components.heatPumpModel} onChange={setComp('heatPumpModel')} suggestions={HEAT_PUMP_MANUFACTURERS} help="Falls Sie's gerade zur Hand haben." />
          <AutocompleteField
            label="Regler / Controller der Wärmepumpe"
            value={site.components.heatPumpController}
            onChange={setComp('heatPumpController')}
            suggestions={HEAT_PUMP_MANUFACTURERS}
            help="Wichtig für die Anbindung (Modbus): Hersteller & Modell des Reglers — nicht das Installationsunternehmen."
          />
          <div className="gf-row2">
            <NumberField label="Wie viele?" value={site.components.heatPumpCount} onChange={setComp('heatPumpCount')} />
            <NumberField label="Größe je Stück" value={site.components.heatPumpKw} onChange={setComp('heatPumpKw')} suffix="kW" />
          </div>
          <ChoiceField label="Wie sind die Wärmepumpen aufgebaut?" value={site.components.heatPumpTopology} onChange={setComp('heatPumpTopology')} options={WP_TOPOLOGY} />
          <ToggleField label="Ist die Wärmepumpe der Haupt-Wärmeerzeuger?" value={site.wpIsMainHeater} onChange={set('wpIsMainHeater')} />
        </div>
      )}

      {has('pv') && (
        <div className="gf-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Solaranlage (PV)</h3>
          <StatusToggle value={site.componentStatus.pv} onChange={setStatus('pv')} />
          <AutocompleteField label="Hersteller & Modell des PV-Wechselrichters" value={site.components.pvInverterModel} onChange={setComp('pvInverterModel')} suggestions={PV_INVERTER_MANUFACTURERS} help="Der Wechselrichter — nicht der Solarteur." />
          <div className="gf-row2">
            <NumberField label="Wie viele Module/Stränge?" value={site.components.pvCount} onChange={setComp('pvCount')} />
            <NumberField label="Größe gesamt" value={site.components.pvKwp} onChange={setComp('pvKwp')} suffix="kWp" />
          </div>
          <ChoiceField
            label="Wird der Solarstrom selbst verbraucht oder voll eingespeist?"
            value={site.pvUsage}
            onChange={set('pvUsage')}
            options={PV_USAGE}
            help="Bei Volleinspeisung steht der PV-Strom der Wärmepumpe nicht zur Verfügung."
          />
          <ChoiceField label="Wer betreibt die PV-Anlage?" value={site.pvOperator} onChange={set('pvOperator')} options={PV_OPERATOR} />
          {site.pvOperator && site.pvOperator.startsWith('Ein Dritter') && (
            <TextField label="Welcher Betreiber?" value={site.pvOperatorName} onChange={set('pvOperatorName')} help="z. B. Einhundert, metergrid …" />
          )}
        </div>
      )}

      {has('batterie') && (
        <div className="gf-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Batteriespeicher</h3>
          <StatusToggle value={site.componentStatus.batterie} onChange={setStatus('batterie')} />
          <AutocompleteField label="Hersteller & Modell des Batterie-Wechselrichters" value={site.components.batteryInverterModel} onChange={setComp('batteryInverterModel')} suggestions={BATTERY_INVERTER_MANUFACTURERS} />
          <div className="gf-row2">
            <NumberField label="Wie viele?" value={site.components.batteryCount} onChange={setComp('batteryCount')} />
            <NumberField label="Größe gesamt" value={site.components.batteryKwh} onChange={setComp('batteryKwh')} suffix="kWh" />
          </div>
        </div>
      )}

      {has('pufferspeicher') && (
        <div className="gf-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Pufferspeicher</h3>
          <StatusToggle value={site.componentStatus.pufferspeicher} onChange={setStatus('pufferspeicher')} />
          <div className="gf-row2">
            <NumberField label="Wie viele?" value={site.components.bufferCount} onChange={setComp('bufferCount')} />
            <NumberField label="Größe je Stück" value={site.components.bufferLiters} onChange={setComp('bufferLiters')} suffix="Liter" />
          </div>
        </div>
      )}

      {has('heizstab') && (
        <div className="gf-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Heizstab</h3>
          <StatusToggle value={site.componentStatus.heizstab} onChange={setStatus('heizstab')} />
          <div className="gf-row2">
            <NumberField label="Wie viele?" value={site.components.heatingRodCount} onChange={setComp('heatingRodCount')} />
            <NumberField label="Größe je Stück" value={site.components.heatingRodKw} onChange={setComp('heatingRodKw')} suffix="kW" />
          </div>
        </div>
      )}

      {/* Zeithorizont, wenn etwas geplant ist */}
      {siteHasPlanned(site) && (
        <ChoiceField label="Wann soll das Geplante in Betrieb gehen?" value={site.planningHorizon} onChange={set('planningHorizon')} options={PLANNING_HORIZON} />
      )}

      {/* ---- Weitere Wärmeerzeuger ---- */}
      <h3 style={{ fontSize: 16, marginTop: 'var(--gf-space-8)' }}>Wärmeerzeugung im Haus</h3>
      <MultiSelectField
        label="Welche weiteren Wärmeerzeuger gibt es neben der Wärmepumpe?"
        value={site.otherHeatSources}
        onChange={set('otherHeatSources')}
        options={OTHER_HEAT_SOURCES}
        help="Mehrfachauswahl. Leer lassen, wenn es nur die Wärmepumpe gibt."
      />

      {/* ---- Anderes EMS / GLT ---- */}
      <h3 style={{ fontSize: 16, marginTop: 'var(--gf-space-8)' }}>Steuerung & Zugang</h3>
      <ToggleField label="Gibt es bereits ein anderes Energiemanagement oder eine Gebäudeleittechnik (GLT)?" value={site.existingEms} onChange={set('existingEms')} />
      {site.existingEms === true && (
        <ChoiceField
          label="Nutzt dieses System Modbus?"
          value={site.existingEmsModbus}
          onChange={set('existingEmsModbus')}
          options={['Ja', 'Nein', 'weiß nicht']}
          help="Eine vorhandene Fremd-Steuerung auf denselben Schnittstellen kann die Anbindung blockieren."
        />
      )}
      <ChoiceField label="Haben wir Zugriff bzw. die Erlaubnis, auf die Anlage zuzugreifen?" value={site.siteAccess} onChange={set('siteAccess')} options={SITE_ACCESS} />

      {/* ---- Einsparpotenziale (optional) ---- */}
      <h3 style={{ fontSize: 16, marginTop: 'var(--gf-space-8)' }}>Berechnung der Einsparpotenziale (optional)</h3>
      <ToggleField
        label="Möchten Sie, dass wir Ihre Einsparpotenziale berechnen?"
        value={site.calcSavings}
        onChange={set('calcSavings')}
        help="Freiwillig. Mit ein paar Zusatzangaben rechnen wir Ihre mögliche Ersparnis genauer aus."
      />
      {site.calcSavings === true && (
        <div className="gf-card" style={{ marginBottom: 16 }}>
          <p className="gf-help" style={{ marginTop: 0 }}>
            Wenn Sie eine Berechnung wünschen, teilen Sie uns bitte diese Infos mit. Ihre Wohneinheiten
            {has('batterie') ? ' und den Batteriespeicher' : ''} übernehmen wir aus Ihren Angaben oben.
          </p>
          <NumberField label="Jährlicher Wärmebedarf des Gebäudes" value={site.annualHeatDemandKwh} onChange={set('annualHeatDemandKwh')} suffix="kWh" help="Grobe Zahl reicht." />
          <NumberField label="Anzahl der Mieterstromteilnehmer" value={site.tenantPowerParticipants} onChange={set('tenantPowerParticipants')} help="Wie viele Parteien beziehen Mieterstrom?" />
          <NumberField label="Strompreis" value={site.electricityPriceEurKwh} onChange={set('electricityPriceEurKwh')} suffix="€/kWh" help="z. B. 0,32" />
        </div>
      )}

      {/* ---- Sonstiges ---- */}
      <TextField label="Wer hat die Anlage(n) gebaut?" value={site.installer} onChange={set('installer')} help="Optional — nur als Nebeninfo, falls wir mal Gerätezugang über den Installateur brauchen." />
      <TextAreaField label="Möchten Sie uns zu dieser Anlage noch etwas sagen?" value={site.comment} onChange={set('comment')} />

      <Hint kind="info">Schätzen ist okay — fehlt etwas, klären wir es gemeinsam.</Hint>
    </div>
  );
}
