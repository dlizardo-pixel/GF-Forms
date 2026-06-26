import { Fragment, useState } from 'react';
import { ENERGY_UNITS, unitKeyForHeatingTypes } from '../../../shared/conversion.js';
import { lookupPlz } from '../../lib/plz.js';
import { Hint } from '../Fields.jsx';
import { isSystemComplete, makeSystem } from '../../lib/standardModel.js';
import { systemHints } from '../../lib/plausibility.js';
import SystemExtraFields from './SystemExtraFields.jsx';
import HeatingTypeDropdown from './HeatingTypeDropdown.jsx';
import ImportModal from './ImportModal.jsx';

// Anzahl der Kernspalten (für colSpan der Detailzeile).
const COL_COUNT = 8;

/**
 * Tabellen-/Rastermodus – HAUPTMODUS für die Anlagen.
 * Eine Zeile je Anlage (wie die gewohnte Excel-Liste). Seltene/optionale
 * Felder stecken in der aufklappbaren Detailzeile, nicht in der Haupttabelle.
 */
export default function SystemGrid({ systems, setSystems, project }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [importOpen, setImportOpen] = useState(false);

  const updateSystem = (index, partial) =>
    setSystems((arr) => arr.map((s, i) => (i === index ? { ...s, ...partial } : s)));

  const addRow = () => setSystems((arr) => [...arr, makeSystem(project)]);

  const duplicateRow = (index) =>
    setSystems((arr) => {
      const copy = [...arr];
      // Vollständige Kopie (inkl. Adresse) – Kunde passt danach nur an.
      copy.splice(index + 1, 0, { ...arr[index] });
      return copy;
    });

  const deleteRow = (index) => setSystems((arr) => arr.filter((_, i) => i !== index));

  // „Werte von oben übernehmen": vorige Zeile als Ausgangswert (ohne Adresse).
  const copyFromAbove = (index) =>
    setSystems((arr) => arr.map((s, i) => (i === index ? makeSystem(project, arr[index - 1]) : s)));

  const toggleExpand = (index) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });

  async function handlePlz(index, value) {
    updateSystem(index, { plz: value });
    if (/^\d{5}$/.test(value.trim())) {
      const res = await lookupPlz(value);
      if (res) updateSystem(index, { city: res.city, lat: res.lat, lng: res.lng });
    }
  }

  // Import aus Excel/CSV/Text: Zeilen anhängen und fehlende Städte nachladen.
  function handleImport(newSystems) {
    setSystems((arr) => {
      const startIndex = arr.length;
      newSystems.forEach((s, k) => {
        if (s.plz && !s.city && /^\d{5}$/.test(s.plz)) {
          lookupPlz(s.plz).then((res) => {
            if (res) updateSystem(startIndex + k, { city: res.city, lat: res.lat, lng: res.lng });
          });
        }
      });
      return [...arr, ...newSystems];
    });
    setImportOpen(false);
  }

  return (
    <div>
      <Hint kind="info">
        Eine Zeile pro Anlage — wie in Ihrer Excel-Liste. Orange unterstrichene Felder brauchen wir;
        der Rest ist freiwillig. Über „Details" klappen Sie weitere Angaben je Anlage auf.
      </Hint>

      {/* Werkzeugleiste */}
      <div style={{ display: 'flex', gap: 'var(--gf-space-2)', flexWrap: 'wrap', margin: '12px 0' }}>
        <button type="button" className="gf-btn gf-btn-ghost" onClick={addRow}>
          + Anlage hinzufügen
        </button>
        <button type="button" className="gf-btn gf-btn-ghost" onClick={() => setImportOpen(true)}>
          Liste importieren (Excel/CSV)
        </button>
      </div>

      <div className="gf-grid-wrap">
        <table className="gf-grid gf-grid-systems">
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Wo steht die Anlage?</th>
              <th>PLZ</th>
              <th>Stadt</th>
              <th>Heizung</th>
              <th>Fläche m²</th>
              <th>Verbrauch letztes Jahr</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {systems.map((s, i) => {
              const unit = ENERGY_UNITS[unitKeyForHeatingTypes(s.heatingTypes)].unit;
              const complete = isSystemComplete(s);
              const isOpen = expanded.has(i);
              const hints = systemHints(s);
              return (
                <Fragment key={i}>
                  <tr>
                    <td className="gf-rownum" title={complete ? 'vollständig' : 'es fehlt noch etwas'}>
                      <button
                        type="button"
                        className="gf-btn gf-btn-text"
                        style={{ padding: 2, fontSize: 13 }}
                        onClick={() => toggleExpand(i)}
                        title="Details auf-/zuklappen"
                      >
                        {isOpen ? '▾' : '▸'}
                      </button>
                      {complete ? '✓' : ''}
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
                        className="gf-grid-req gf-col-plz"
                        value={s.plz}
                        onChange={(e) => handlePlz(i, e.target.value)}
                      />
                    </td>
                    <td>
                      <input className="gf-col-city" value={s.city} onChange={(e) => updateSystem(i, { city: e.target.value })} />
                    </td>
                    <td>
                      {/* Kompakte Mehrfachauswahl direkt in der Zelle */}
                      <HeatingTypeDropdown system={s} onChange={(partial) => updateSystem(i, partial)} />
                    </td>
                    <td>
                      <input
                        className="gf-grid-req gf-col-num"
                        type="number"
                        value={s.heatedAreaM2}
                        onChange={(e) => updateSystem(i, { heatedAreaM2: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="gf-grid-req gf-col-num"
                        type="number"
                        value={s.consumptionLastYear}
                        onChange={(e) => updateSystem(i, { consumptionLastYear: e.target.value })}
                        title={`Einheit: ${unit}`}
                        placeholder={unit}
                      />
                    </td>
                    <td className="gf-col-actions">
                      {i > 0 && (
                        <button
                          type="button"
                          className="gf-btn gf-btn-text"
                          style={{ fontSize: 15, padding: 2 }}
                          onClick={() => copyFromAbove(i)}
                          title="Werte von oben übernehmen (ohne Adresse)"
                        >
                          ↧
                        </button>
                      )}
                      <button
                        type="button"
                        className="gf-btn gf-btn-text"
                        style={{ fontSize: 15, padding: 2 }}
                        onClick={() => duplicateRow(i)}
                        title="Zeile duplizieren"
                      >
                        ⧉
                      </button>
                      {systems.length > 1 && (
                        <button
                          type="button"
                          className="gf-btn gf-btn-text"
                          style={{ fontSize: 15, padding: 2, color: 'var(--gf-error)' }}
                          onClick={() => deleteRow(i)}
                          title="Zeile löschen"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={COL_COUNT} style={{ background: 'var(--gf-bg)', padding: 'var(--gf-space-4)' }}>
                        {hints.map((h, k) => (
                          <Hint key={k} kind="soft">
                            {h}
                          </Hint>
                        ))}
                        <SystemExtraFields system={s} onChange={(partial) => updateSystem(i, partial)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {importOpen && <ImportModal project={project} onImport={handleImport} onClose={() => setImportOpen(false)} />}
    </div>
  );
}
