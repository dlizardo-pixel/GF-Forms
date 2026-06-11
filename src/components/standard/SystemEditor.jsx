import { TextField, NumberField, ChoiceField, Hint } from '../Fields.jsx';
import PlzCity from '../PlzCity.jsx';
import SystemExtraFields from './SystemExtraFields.jsx';
import { HEATING_TYPES } from '../../lib/options.js';
import { ENERGY_UNITS, unitKeyForHeatingType, describeConversion } from '../../../shared/conversion.js';
import { systemHints } from '../../lib/plausibility.js';
import { HEATING_TYPE_ICON } from '../../lib/brandAssets.js';

// Heizungstypen mit passenden Brand-Icons als Auswahl-Optionen.
const HEATING_TYPE_OPTIONS = HEATING_TYPES.map((t) => ({ value: t, label: t, icon: HEATING_TYPE_ICON[t] }));

/**
 * Geführter Editor für EINE Anlage (Modus für wenige Anlagen).
 * Reihenfolge bewusst: erst Leichtes (Adresse), dann Schweres (Verbrauch).
 * Alles Optionale/Seltene steckt in <SystemExtraFields>.
 */
export default function SystemEditor({ system, onChange }) {
  const set = (key) => (val) => onChange({ [key]: val });
  const patch = (partial) => onChange(partial);

  const unitMeta = ENERGY_UNITS[unitKeyForHeatingType(system.heatingType)];
  const conv = describeConversion(system.consumptionLastYear, system.heatingType);
  const hints = systemHints(system);

  return (
    <div>
      {/* ---- Adresse (leicht, zum Reinkommen) ---- */}
      <TextField
        label="Wo steht der Heizungskeller?"
        value={system.streetHeating}
        onChange={set('streetHeating')}
        required
        help="Adresse des Gebäudes mit der Anlage."
        placeholder="z. B. Musterstraße 12"
      />
      <PlzCity plz={system.plz} city={system.city} onPatch={patch} />

      {/* ---- Heizungstyp ---- */}
      <ChoiceField
        label="Was für eine Heizung ist das?"
        value={system.heatingType}
        onChange={set('heatingType')}
        options={HEATING_TYPE_OPTIONS}
        required
      />

      {/* ---- Fläche ---- */}
      <NumberField
        label="Wie groß ist die beheizte Fläche?"
        value={system.heatedAreaM2}
        onChange={set('heatedAreaM2')}
        suffix="m²"
        required
        help="Wohn- plus Gewerbefläche, grob geschätzt ist okay."
      />

      {/* ---- Verbrauch (das Schwere – am Ende) ---- */}
      <NumberField
        label="Wie viel hat die Anlage letztes Jahr verbraucht?"
        value={system.consumptionLastYear}
        onChange={set('consumptionLastYear')}
        suffix={unitMeta.unit}
        required
        help={'Steht auf der Heizkostenabrechnung unter „Verbrauch gesamt". Schätzen ist okay — wir prüfen das gemeinsam.'}
      />
      {conv && unitMeta.factor !== 1.0 && (
        <Hint kind="info">Wir rechnen das für Sie um: {conv}</Hint>
      )}
      {hints.map((h, i) => (
        <Hint key={i} kind="soft">
          {h}
        </Hint>
      ))}

      {/* ---- Alles Weitere (optional/selten) ---- */}
      <h3 style={{ fontSize: 16, marginTop: 'var(--gf-space-8)' }}>Noch ein paar Details (alles freiwillig)</h3>
      <SystemExtraFields system={system} onChange={onChange} />
    </div>
  );
}
