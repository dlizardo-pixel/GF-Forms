import { TextField, NumberField, ToggleField } from '../Fields.jsx';
import { ENERGY_UNITS, unitKeyForHeatingType } from '../../../shared/conversion.js';

/**
 * Optionale / seltenere Felder einer Anlage. Wird im geführten Editor und in der
 * aufklappbaren Detailzeile der Tabelle verwendet (Texte nur an einer Stelle).
 *
 * Bewusst NICHT enthalten: Adresse, PLZ/Stadt, Heizungstyp, beheizte Fläche,
 * Verbrauch letztes Jahr (= Kern-/Pflichtfelder). Ebenfalls bewusst weggelassen,
 * weil sie nicht in die Einsparungsrechnung eingehen: Leistung, Modell/Infos,
 * Baujahr, „macht Warmwasser?", Abrechnungsturnus, zweites Vorjahr.
 */
export default function SystemExtraFields({ system, onChange }) {
  const set = (key) => (val) => onChange({ [key]: val });
  const unit = ENERGY_UNITS[unitKeyForHeatingType(system.heatingType)].unit;

  return (
    <div>
      {/* Mehrere Gebäude / Unterstationen — eine Frage (geht in die Preisstufe ein). */}
      <ToggleField
        label="Versorgt die Anlage mehrere Gebäude oder gibt es Unterstationen?"
        value={system.multiSupply}
        onChange={set('multiSupply')}
        help="Falls Sie's nicht genau wissen: grob schätzen reicht."
      />
      {system.multiSupply === true && (
        <NumberField
          label="Wie viele Gebäude / Unterstationen sind das?"
          value={system.supplyCount}
          onChange={set('supplyCount')}
          help="Ungefähre Zahl genügt."
        />
      )}

      <NumberField
        label="Wie viele Wohnungen hängen dran?"
        value={system.residentialUnits}
        onChange={set('residentialUnits')}
        help="Grobe Zahl reicht."
      />

      {/* Selten – nur bei Fernwärme (geht in die Preisstufe ein). */}
      {system.heatingType === 'Fernwärme' && (
        <NumberField
          label="Vertraglich vereinbarte Anschlussleistung (kW)"
          value={system.districtHeatingConnectionKw}
          onChange={set('districtHeatingConnectionKw')}
          suffix="kW"
          help="Steht im Fernwärme-Vertrag. Optional."
        />
      )}

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
        help="Ein Vorjahr reicht als Plausibilitätscheck. Optional."
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
        </div>
      </details>
    </div>
  );
}
