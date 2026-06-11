import { HEATING_TYPES } from '../../lib/options.js';
import { ENERGY_UNITS, unitKeyForHeatingType } from '../../../shared/conversion.js';
import { lookupPlz } from '../../lib/plz.js';
import { Hint } from '../Fields.jsx';
import { isSystemComplete } from '../../lib/standardModel.js';

/**
 * Kompakter Tabellen-/Rastermodus für viele Anlagen (≈ > 10).
 * Eine Zeile pro Anlage; die wichtigsten Felder direkt editierbar.
 * Optionale Detailfelder bleiben dem geführten Modus vorbehalten – hier
 * zählt schnelle, zeilenweise Erfassung.
 */
export default function SystemGrid({ systems, updateSystem, copyFromPrevious }) {
  async function handlePlz(index, value) {
    updateSystem(index, { plz: value });
    if (/^\d{5}$/.test(value.trim())) {
      const res = await lookupPlz(value);
      if (res) updateSystem(index, { city: res.city, lat: res.lat, lng: res.lng });
    }
  }

  return (
    <div>
      <Hint kind="info">
        Pflichtfelder sind orange unterstrichen. Der Verbrauch ist je nach Heizungstyp in der
        passenden Einheit einzutragen (z. B. m³ bei Gas, kWh bei Fernwärme). Für optionale Detailangaben
        nutzen Sie bitte den geführten Modus.
      </Hint>

      <div className="gf-grid-wrap">
        <table className="gf-grid">
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Straße &amp; Hausnr.</th>
              <th>PLZ</th>
              <th>Stadt</th>
              <th>Heizungstyp</th>
              <th>Leistung kW</th>
              <th>Wohneinheiten</th>
              <th>Beheizte Fläche m²</th>
              <th>Verbrauch letztes Jahr</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {systems.map((s, i) => {
              const unit = ENERGY_UNITS[unitKeyForHeatingType(s.heatingType)].unit;
              const complete = isSystemComplete(s);
              return (
                <tr key={i}>
                  <td className="gf-rownum" title={complete ? 'vollständig' : 'Pflichtfelder fehlen'}>
                    {complete ? '✓ ' : ''}
                    {i + 1}
                  </td>
                  <td>
                    <input
                      className="gf-grid-req"
                      value={s.streetHeating}
                      onChange={(e) => updateSystem(i, { streetHeating: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="gf-grid-req"
                      value={s.plz}
                      onChange={(e) => handlePlz(i, e.target.value)}
                      style={{ minWidth: 70 }}
                    />
                  </td>
                  <td>
                    <input
                      className="gf-grid-req"
                      value={s.city}
                      onChange={(e) => updateSystem(i, { city: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      className="gf-grid-req"
                      value={s.heatingType}
                      onChange={(e) => updateSystem(i, { heatingType: e.target.value })}
                    >
                      <option value="">– wählen –</option>
                      {HEATING_TYPES.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={s.powerKw}
                      onChange={(e) => updateSystem(i, { powerKw: e.target.value })}
                      style={{ minWidth: 80 }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={s.residentialUnits}
                      onChange={(e) => updateSystem(i, { residentialUnits: e.target.value })}
                      style={{ minWidth: 80 }}
                    />
                  </td>
                  <td>
                    <input
                      className="gf-grid-req"
                      type="number"
                      value={s.heatedAreaM2}
                      onChange={(e) => updateSystem(i, { heatedAreaM2: e.target.value })}
                      style={{ minWidth: 90 }}
                    />
                  </td>
                  <td>
                    <input
                      className="gf-grid-req"
                      type="number"
                      value={s.consumptionLastYear}
                      onChange={(e) => updateSystem(i, { consumptionLastYear: e.target.value })}
                      style={{ minWidth: 110 }}
                      title={`Einheit: ${unit}`}
                      placeholder={unit}
                    />
                  </td>
                  <td>
                    {i > 0 && (
                      <button
                        type="button"
                        className="gf-btn gf-btn-text"
                        style={{ fontSize: 13, whiteSpace: 'nowrap' }}
                        onClick={() => copyFromPrevious(i)}
                        title="Werte der vorigen Anlage übernehmen (außer Adresse)"
                      >
                        ↧ übernehmen
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
