import { useState } from 'react';
import {
  TextField,
  NumberField,
  ChoiceField,
  ToggleField,
  TextAreaField,
  Hint,
} from '../Fields.jsx';
import PlzCity from '../PlzCity.jsx';
import { HEATING_TYPES, BILLING_CYCLES } from '../../lib/options.js';
import { ENERGY_UNITS, unitKeyForHeatingType, describeConversion } from '../../../shared/conversion.js';
import { systemHints } from '../../lib/plausibility.js';

/**
 * Geführter Editor für EINE Anlage (Modus für wenige Anlagen).
 * Zeigt alle Abschnitte sauber gegliedert mit bedingten Feldern.
 */
export default function SystemEditor({ system, onChange }) {
  const [showSupplied, setShowSupplied] = useState(!!system.suppliedBuildings);
  const set = (key) => (val) => onChange({ [key]: val });
  const patch = (partial) => onChange(partial);

  const unitMeta = ENERGY_UNITS[unitKeyForHeatingType(system.heatingType)];
  const conv = describeConversion(system.consumptionLastYear, system.heatingType);
  const hints = systemHints(system);

  return (
    <div>
      {/* ---- Adresse ---- */}
      <h3 className="gf-step-title" style={{ fontSize: 20 }}>Adresse</h3>
      <TextField
        label="Straße & Hausnummer der Heizungsanlage"
        value={system.streetHeating}
        onChange={set('streetHeating')}
        required
        placeholder="z. B. Musterstraße 12"
      />

      {!showSupplied ? (
        <button type="button" className="gf-btn gf-btn-text" onClick={() => setShowSupplied(true)}>
          + Versorgte Gebäude weichen ab
        </button>
      ) : (
        <TextField
          label="Straße & Hausnummer(n) der versorgten Gebäude (falls abweichend)"
          value={system.suppliedBuildings}
          onChange={set('suppliedBuildings')}
          help="Nur ausfüllen, wenn die versorgten Gebäude von der Anlagen-Adresse abweichen."
        />
      )}

      <PlzCity plz={system.plz} city={system.city} onPatch={patch} />

      {/* ---- Heizung ---- */}
      <h3 className="gf-step-title" style={{ fontSize: 20, marginTop: 24 }}>Heizung</h3>
      <ChoiceField
        label="Heizungstyp"
        value={system.heatingType}
        onChange={set('heatingType')}
        options={HEATING_TYPES}
        required
      />

      <ToggleField
        label="Unterstation vorhanden?"
        value={system.substationPresent}
        onChange={set('substationPresent')}
      />
      {system.substationPresent === true && (
        <NumberField label="Anzahl Unterstationen" value={system.substationCount} onChange={set('substationCount')} />
      )}

      <NumberField label="Leistung" value={system.powerKw} onChange={set('powerKw')} suffix="kW" />
      <TextField label="Modell / Infos zum Heizungstyp" value={system.modelInfo} onChange={set('modelInfo')} />

      {/* Bedingtes Feld: nur bei Fernwärme */}
      {system.heatingType === 'Fernwärme' && (
        <NumberField
          label="Vertragliche Anschlussleistung"
          value={system.districtHeatingConnectionKw}
          onChange={set('districtHeatingConnectionKw')}
          suffix="kW"
        />
      )}

      <ToggleField
        label="Zentrales Warmwasser vorhanden?"
        value={system.centralHotWater}
        onChange={set('centralHotWater')}
      />

      {/* ---- Gebäude ---- */}
      <h3 className="gf-step-title" style={{ fontSize: 20, marginTop: 24 }}>Gebäude</h3>
      <NumberField label="Anzahl Wohneinheiten" value={system.residentialUnits} onChange={set('residentialUnits')} help="Empfohlen." />
      <NumberField label="Baujahr / Jahr der letzten Sanierung" value={system.constructionYear} onChange={set('constructionYear')} />
      <NumberField label="Beheizte Fläche" value={system.heatedAreaM2} onChange={set('heatedAreaM2')} suffix="m²" required />
      <TextField label="Besonderheiten" value={system.specialNotes} onChange={set('specialNotes')} help='z. B. „PV auf Dach"' />

      {/* ---- Verbrauch ---- */}
      <h3 className="gf-step-title" style={{ fontSize: 20, marginTop: 24 }}>Verbrauch</h3>
      <Hint kind="info">
        Bitte geben Sie den Verbrauch in <strong>{unitMeta.unit}</strong> an. {unitMeta.note}
      </Hint>
      <NumberField
        label="Jahresverbrauch letztes Jahr"
        value={system.consumptionLastYear}
        onChange={set('consumptionLastYear')}
        suffix={unitMeta.unit}
        required
      />
      {conv && unitMeta.factor !== 1.0 && <Hint kind="info">Umrechnung: {conv}</Hint>}
      <NumberField
        label="Jahresverbrauch vorletztes Jahr"
        value={system.consumptionPrevYear}
        onChange={set('consumptionPrevYear')}
        suffix={unitMeta.unit}
      />
      <NumberField
        label="Jahresverbrauch vor-vorletztes Jahr"
        value={system.consumptionPrevPrevYear}
        onChange={set('consumptionPrevPrevYear')}
        suffix={unitMeta.unit}
      />

      {hints.map((h, i) => (
        <Hint key={i} kind="soft">
          {h}
        </Hint>
      ))}

      {/* ---- Optional: Vertrag & Abrechnung ---- */}
      <details className="gf-collapse">
        <summary>Nur für Vertrag &amp; Abrechnung (optional)</summary>
        <div className="gf-collapse-body">
          <TextField label="Hauswart / Ansprechpartner vor Ort" value={system.caretakerContact} onChange={set('caretakerContact')} />
          <TextField label="Telefon" value={system.caretakerPhone} onChange={set('caretakerPhone')} />
          <TextField label="Anzahl & Zuordnung der Heizkreise" value={system.heatingCircuits} onChange={set('heatingCircuits')} />
          <ToggleField label="Internetzugang via Modem vorhanden?" value={system.internetModem} onChange={set('internetModem')} />
          {system.internetModem === true && (
            <TextField label="Ggf. Passwort" value={system.internetPassword} onChange={set('internetPassword')} />
          )}
          <TextField label="Rechnungsanschrift" value={system.billingAddress} onChange={set('billingAddress')} />
          <TextField label="E-Mail für Rechnungsversand" value={system.billingEmail} onChange={set('billingEmail')} />
          <TextField label="Weitere Empfänger" value={system.additionalRecipients} onChange={set('additionalRecipients')} />
          <TextField label="Referenznummer" value={system.referenceNumber} onChange={set('referenceNumber')} />
          <ChoiceField label="Abrechnungsturnus" value={system.billingCycle} onChange={set('billingCycle')} options={BILLING_CYCLES.filter((b) => b !== '(keine Angabe)')} />
        </div>
      </details>
    </div>
  );
}
