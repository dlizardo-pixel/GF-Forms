import { Fragment, useState } from 'react';
import { HEATING_TYPES } from '../../lib/options.js';
import { ENERGY_UNITS, unitKeyForHeatingType } from '../../../shared/conversion.js';
import { lookupPlz } from '../../lib/plz.js';
import { Hint } from '../Fields.jsx';
import { isSystemComplete, makeSystem } from '../../lib/standardModel.js';
import { systemHints } from '../../lib/plausibility.js';
import SystemExtraFields from './SystemExtraFields.jsx';

// Anzahl der Kernspalten (für colSpan der Detailzeile).
const COL_COUNT = 8;

// Lockere Zuordnung getippter/eingefügter Heizungs-Begriffe → unsere Werte.
const HEATING_SYNONYMS = {
  gas: 'Gas zentral',
  'gas zentral': 'Gas zentral',
  gaskombi: 'Gaskombi',
  'gas-kombi': 'Gaskombi',
  fernwärme: 'Fernwärme',
  fernwaerme: 'Fernwärme',
  wärmepumpe: 'Wärmepumpe',
  waermepumpe: 'Wärmepumpe',
  wp: 'Wärmepumpe',
  öl: 'Öl',
  oel: 'Öl',
  ölheizung: 'Öl',
  pellets: 'Holz-Pellets',
  'holz-pellets': 'Holz-Pellets',
  holz: 'Holz-Pellets',
};

function normalizeHeating(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  const hit = HEATING_TYPES.find((h) => h.toLowerCase() === v.toLowerCase());
  if (hit) return hit;
  return HEATING_SYNONYMS[v.toLowerCase()] || v;
}

/**
 * Tabellen-/Rastermodus – HAUPTMODUS für die Anlagen.
 * Eine Zeile je Anlage (wie die gewohnte Excel-Liste). Seltene/optionale
 * Felder stecken in der aufklappbaren Detailzeile, nicht in der Haupttabelle.
 */
export default function SystemGrid({ systems, setSystems, project }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

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

  // ---- Aus Excel einfügen ----
  function applyPaste() {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setPasteOpen(false);
      return;
    }
    const newRows = lines.map((line) => {
      const cells = line.split('\t');
      const s = makeSystem(project);
      const [street, plz, city, heating, area, consumption] = cells;
      if (street) s.streetHeating = street.trim();
      if (plz) s.plz = plz.trim();
      if (city) s.city = city.trim();
      if (heating) s.heatingType = normalizeHeating(heating);
      if (area) s.heatedAreaM2 = area.replace(/[^\d.,]/g, '').replace(',', '.');
      if (consumption) s.consumptionLastYear = consumption.replace(/[^\d.,]/g, '').replace(',', '.');
      return s;
    });

    setSystems((arr) => {
      const startIndex = arr.length;
      const merged = [...arr, ...newRows];
      // Fehlende Städte aus der PLZ nachladen (asynchron, unkritisch).
      newRows.forEach((s, k) => {
        if (s.plz && !s.city && /^\d{5}$/.test(s.plz)) {
          lookupPlz(s.plz).then((res) => {
            if (res) updateSystem(startIndex + k, { city: res.city, lat: res.lat, lng: res.lng });
          });
        }
      });
      return merged;
    });

    setPasteText('');
    setPasteOpen(false);
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
        <button type="button" className="gf-btn gf-btn-ghost" onClick={() => setPasteOpen(true)}>
          Aus Excel einfügen
        </button>
      </div>

      <div className="gf-grid-wrap">
        <table className="gf-grid">
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
              const unit = ENERGY_UNITS[unitKeyForHeatingType(s.heatingType)].unit;
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
                        style={{ minWidth: 160 }}
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
                      <input value={s.city} onChange={(e) => updateSystem(i, { city: e.target.value })} />
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
                        style={{ minWidth: 120 }}
                        title={`Einheit: ${unit}`}
                        placeholder={unit}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {i > 0 && (
                        <button
                          type="button"
                          className="gf-btn gf-btn-text"
                          style={{ fontSize: 13 }}
                          onClick={() => copyFromAbove(i)}
                          title="Werte von oben übernehmen (ohne Adresse)"
                        >
                          ↧
                        </button>
                      )}
                      <button
                        type="button"
                        className="gf-btn gf-btn-text"
                        style={{ fontSize: 13 }}
                        onClick={() => duplicateRow(i)}
                        title="Zeile duplizieren"
                      >
                        ⧉
                      </button>
                      {systems.length > 1 && (
                        <button
                          type="button"
                          className="gf-btn gf-btn-text"
                          style={{ fontSize: 13, color: 'var(--gf-error)' }}
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

      {/* Einfügen-Dialog */}
      {pasteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6,39,38,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => setPasteOpen(false)}
        >
          <div className="gf-card" style={{ maxWidth: 560, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Aus Excel einfügen</h3>
            <p className="gf-help" style={{ marginTop: 0 }}>
              Markieren Sie in Ihrer Liste die Spalten in dieser Reihenfolge, kopieren Sie sie und fügen Sie
              sie unten ein (eine Zeile pro Anlage):
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gf-brand-dark-grey)' }}>
              Straße &amp; Hausnr. · PLZ · Stadt · Heizung · Fläche m² · Verbrauch letztes Jahr
            </p>
            <textarea
              className="gf-textarea"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'Musterstraße 12\t10115\tBerlin\tGas zentral\t1200\t150000'}
              style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 13 }}
            />
            <div className="gf-actions">
              <button type="button" className="gf-btn gf-btn-ghost" onClick={() => setPasteOpen(false)}>
                Abbrechen
              </button>
              <button type="button" className="gf-btn gf-btn-primary" onClick={applyPaste}>
                Zeilen einfügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
