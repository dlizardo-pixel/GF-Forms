import { MultiSelectField, TextField } from '../Fields.jsx';
import { HEATING_TYPES, HEATING_OTHER } from '../../lib/options.js';
import { HEATING_TYPE_ICON } from '../../lib/brandAssets.js';

const OPTIONS = HEATING_TYPES.map((t) => ({ key: t, label: t, icon: HEATING_TYPE_ICON[t] }));

/**
 * Heizungstyp als Mehrfachauswahl (eine Anlage kann mehrere Erzeuger haben,
 * z. B. „BHKW + Gaskessel" oder „Gas + Wärmepumpe"). Ist „Was anderes / weiß
 * nicht" gewählt, erscheint ein Freitextfeld.
 */
export default function HeatingTypeField({ system, onChange, required }) {
  const types = system.heatingTypes || [];
  return (
    <div>
      <MultiSelectField
        label="Was für eine Heizung ist das?"
        value={types}
        onChange={(v) => onChange({ heatingTypes: v })}
        options={OPTIONS}
        required={required}
        help="Mehrfachauswahl möglich – wählen Sie alles, was zur Anlage gehört."
      />
      {types.includes(HEATING_OTHER) && (
        <TextField
          label="Bitte kurz beschreiben"
          value={system.heatingTypeOther}
          onChange={(v) => onChange({ heatingTypeOther: v })}
          placeholder="z. B. Nahwärme-Insel, Sondertyp …"
        />
      )}
    </div>
  );
}
