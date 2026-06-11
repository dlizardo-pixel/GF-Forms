import { TextField, NumberField, ToggleField } from '../Fields.jsx';
import { BILLING_CYCLES } from '../../lib/options.js';
import { ChoiceField } from '../Fields.jsx';
import { ENERGY_UNITS, unitKeyForHeatingType } from '../../../shared/conversion.js';

/**
 * Alle optionalen / selteneren Felder einer Anlage. Wird sowohl im geführten
 * Editor als auch in der aufklappbaren Detailzeile der Tabelle verwendet, damit
 * die Texte nur an einer Stelle gepflegt werden.
 *
 * Bewusst NICHT enthalten (das sind die Pflicht-/Kernfelder, die im geführten
 * Fluss bzw. in den Tabellenspalten erfasst werden):
 * Adresse, PLZ/Stadt, Heizungstyp, beheizte Fläche, Verbrauch letztes Jahr.
 */
export default function SystemExtraFields({ system, onChange }) {
  const set = (key) => (val) => onChange({ [key]: val });
  const unit = ENERGY_UNITS[unitKeyForHeatingType(system.heatingType)].unit;

  return (
    <div>
      <TextField
        label="Versorgt die Anlage noch andere Häuser?"
        value={system.suppliedBuildings}
        onChange={set('suppliedBuildings')}
        help="Nur wenn ja — sonst überspringen."
      />

      <NumberField
        label="Wie viele Wohnungen hängen dran?"
        value={system.residentialUnits}
        onChange={set('residentialUnits')}
        help="Grobe Zahl reicht."
      />

      <ToggleField
        label="Macht die Anlage auch das Warmwasser?"
        value={system.centralHotWater}
        onChange={set('centralHotWater')}
      />

      <ToggleField
        label="Gibt es Unterstationen?"
        value={system.substationPresent}
        onChange={set('substationPresent')}
        help="Falls Sie's nicht wissen: kein Problem, einfach offen lassen."
      />
      {system.substationPresent === true && (
        <NumberField label="Wie viele Unterstationen?" value={system.substationCount} onChange={set('substationCount')} />
      )}

      <NumberField
        label="Leistung der Anlage (kW)"
        value={system.powerKw}
        onChange={set('powerKw')}
        suffix="kW"
        help="Steht oft am Kessel oder in den Unterlagen. Optional."
      />
      <TextField label="Modell oder weitere Infos zur Anlage" value={system.modelInfo} onChange={set('modelInfo')} />

      {/* Selten – nur bei Fernwärme */}
      {system.heatingType === 'Fernwärme' && (
        <NumberField
          label="Vertraglich vereinbarte Anschlussleistung (kW)"
          value={system.districtHeatingConnectionKw}
          onChange={set('districtHeatingConnectionKw')}
          suffix="kW"
          help="Steht im Fernwärme-Vertrag. Optional."
        />
      )}

      <NumberField
        label="Baujahr oder letzte Sanierung"
        value={system.constructionYear}
        onChange={set('constructionYear')}
        help="Ungefähr reicht. Optional."
      />
      <TextField
        label="Gibt es etwas Besonderes?"
        value={system.specialNotes}
        onChange={set('specialNotes')}
        help="z. B. PV auf dem Dach, alte Anlage, Wärmepumpe geplant."
      />

      <NumberField
        label="Und im Jahr davor?"
        value={system.consumptionPrevYear}
        onChange={set('consumptionPrevYear')}
        suffix={unit}
        help="Falls Sie es zur Hand haben. Optional."
      />
      <NumberField
        label="Und im Jahr davor?"
        value={system.consumptionPrevPrevYear}
        onChange={set('consumptionPrevPrevYear')}
        suffix={unit}
        help="Optional."
      />

      {/* Vertrag & Abrechnung – ausdrücklich später möglich */}
      <details className="gf-collapse">
        <summary>Das brauchen wir erst, wenn's konkret wird</summary>
        <div className="gf-collapse-body">
          <p className="gf-help" style={{ marginTop: 0 }}>
            Können Sie jetzt ausfüllen oder später nachreichen — ganz wie es Ihnen passt.
          </p>
          <TextField label="Hauswart oder Ansprechpartner vor Ort" value={system.caretakerContact} onChange={set('caretakerContact')} />
          <TextField label="Telefon" value={system.caretakerPhone} onChange={set('caretakerPhone')} />
          <TextField label="Heizkreise (Anzahl & Zuordnung)" value={system.heatingCircuits} onChange={set('heatingCircuits')} />
          <ToggleField label="Internetzugang über ein Modem vorhanden?" value={system.internetModem} onChange={set('internetModem')} />
          {system.internetModem === true && (
            <TextField label="Ggf. Passwort" value={system.internetPassword} onChange={set('internetPassword')} />
          )}
          <TextField label="Rechnungsanschrift" value={system.billingAddress} onChange={set('billingAddress')} help="Für die Betriebskostenabrechnung." />
          <TextField label="E-Mail für den Rechnungsversand" value={system.billingEmail} onChange={set('billingEmail')} />
          <TextField label="Weitere Empfänger" value={system.additionalRecipients} onChange={set('additionalRecipients')} />
          <TextField label="Referenznummer" value={system.referenceNumber} onChange={set('referenceNumber')} />
          <ChoiceField
            label="Abrechnungsturnus"
            value={system.billingCycle}
            onChange={set('billingCycle')}
            options={BILLING_CYCLES.filter((b) => b !== '(keine Angabe)')}
          />
        </div>
      </details>
    </div>
  );
}
