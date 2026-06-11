import { useMemo, useState } from 'react';
import readXlsxFile from 'read-excel-file';
import { Hint } from '../Fields.jsx';
import { makeSystem } from '../../lib/standardModel.js';
import { HEATING_TYPES } from '../../lib/options.js';
import {
  IMPORT_FIELDS,
  parseText,
  cleanNumber,
  normalizeHeating,
  looksLikeHeader,
  guessMapping,
} from '../../lib/importParse.js';

/**
 * Import-Dialog: Excel-/CSV-Datei hochladen ODER Tabelle einfügen.
 * Danach erkennt die Anwendung die Spalten automatisch, zeigt eine Vorschau und
 * lässt die Zuordnung vor dem Übernehmen korrigieren – so fallen Format-Probleme
 * sofort auf, statt stillschweigend falsche Daten zu erzeugen.
 */
export default function ImportModal({ project, onImport, onClose }) {
  const [matrix, setMatrix] = useState(null); // Roh-Tabelle (Zeilen × Zellen)
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState({});
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  // Tabelle übernehmen (aus Datei oder Text) und Spalten automatisch erkennen.
  function loadMatrix(rows, name) {
    const clean = (rows || []).filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
    if (clean.length === 0) {
      setError('Wir konnten keine Tabellenzeilen erkennen. Bitte prüfen Sie die Datei oder den eingefügten Text.');
      return;
    }
    const header = clean[0].map((c) => String(c ?? ''));
    const isHeader = looksLikeHeader(header);
    setMatrix(clean);
    setHasHeader(isHeader);
    setMapping(guessMapping(header, isHeader));
    setFileName(name || '');
    setError('');
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      if (file.name.toLowerCase().endsWith('.xlsx')) {
        const rows = await readXlsxFile(file);
        loadMatrix(rows.map((r) => r.map((c) => (c == null ? '' : c))), file.name);
      } else {
        // CSV / Text
        const text = await file.text();
        loadMatrix(parseText(text), file.name);
      }
    } catch (err) {
      setError('Diese Datei ließ sich nicht lesen (' + err.message + '). Tipp: als .xlsx oder .csv speichern, oder die Tabelle unten einfügen.');
    }
  }

  function handlePaste() {
    loadMatrix(parseText(pasteText), '');
  }

  // Spaltenanzahl für die Auswahl-Dropdowns.
  const colCount = matrix ? Math.max(...matrix.map((r) => r.length)) : 0;
  const header = matrix ? matrix[0].map((c) => String(c ?? '')) : [];
  const dataRows = useMemo(() => (matrix ? (hasHeader ? matrix.slice(1) : matrix) : []), [matrix, hasHeader]);

  const colLabel = (ci) => {
    if (hasHeader && header[ci]?.trim()) return `${header[ci]} (Spalte ${ci + 1})`;
    return `Spalte ${ci + 1}`;
  };

  // Eine Datenzeile gemäß Zuordnung in ein System-Objekt überführen.
  function rowToSystem(row) {
    const s = makeSystem(project);
    for (const f of IMPORT_FIELDS) {
      const ci = mapping[f.key];
      if (ci === undefined || ci === '' || ci < 0) continue;
      const val = row[ci];
      if (val == null || String(val).trim() === '') continue;
      if (f.key === 'heatingType') s.heatingType = normalizeHeating(val, HEATING_TYPES);
      else if (f.key === 'heatedAreaM2' || f.key === 'consumptionLastYear') s[f.key] = cleanNumber(val);
      else s[f.key] = String(val).trim();
    }
    return s;
  }

  function doImport() {
    const systems = dataRows
      .map(rowToSystem)
      .filter((s) => s.streetHeating || s.plz || s.heatedAreaM2 || s.consumptionLastYear);
    if (systems.length === 0) {
      setError('Keine übernehmbaren Zeilen gefunden – bitte Zuordnung prüfen.');
      return;
    }
    onImport(systems);
  }

  return (
    <div className="gf-modal-overlay" onClick={onClose}>
      <div className="gf-card gf-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Liste importieren</h3>

        {!matrix && (
          <>
            <p className="gf-help" style={{ marginTop: 0 }}>
              Laden Sie Ihre vorhandene Liste als <strong>Excel (.xlsx)</strong> oder <strong>CSV</strong> hoch –
              die Spalten müssen nicht in einer bestimmten Reihenfolge sein, wir erkennen sie automatisch und
              zeigen Ihnen vorher eine Vorschau.
            </p>
            <label className="gf-btn gf-btn-primary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
              Datei wählen (Excel/CSV)
              <input type="file" accept=".xlsx,.csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
            </label>

            <p className="gf-help" style={{ margin: '20px 0 6px' }}>… oder Tabelle direkt einfügen (aus Excel kopiert):</p>
            <textarea
              className="gf-textarea"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={'Straße\tPLZ\tStadt\tHeizung\tFläche\tVerbrauch\nMusterstr. 12\t10115\tBerlin\tGas zentral\t1200\t150000'}
              style={{ minHeight: 110, fontFamily: 'monospace', fontSize: 13 }}
            />
            <div className="gf-actions">
              <button type="button" className="gf-btn gf-btn-ghost" onClick={onClose}>
                Abbrechen
              </button>
              <button type="button" className="gf-btn gf-btn-primary" disabled={!pasteText.trim()} onClick={handlePaste}>
                Einfügen & prüfen
              </button>
            </div>
          </>
        )}

        {matrix && (
          <>
            {fileName && <p className="gf-help" style={{ marginTop: 0 }}>Datei: {fileName}</p>}

            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 12 }}>
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
              Erste Zeile enthält Überschriften
            </label>

            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Spalten zuordnen</p>
            <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{f.label}</span>
                  <select
                    className="gf-select"
                    value={mapping[f.key] ?? ''}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [f.key]: e.target.value === '' ? '' : Number(e.target.value) }))
                    }
                  >
                    <option value="">— nicht übernehmen —</option>
                    {Array.from({ length: colCount }).map((_, ci) => (
                      <option key={ci} value={ci}>
                        {colLabel(ci)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Vorschau der ersten Zeilen */}
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Vorschau ({dataRows.length} Zeile{dataRows.length === 1 ? '' : 'n'})
            </p>
            <div className="gf-grid-wrap" style={{ marginBottom: 16 }}>
              <table className="gf-grid">
                <thead>
                  <tr>
                    {IMPORT_FIELDS.map((f) => (
                      <th key={f.key}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.slice(0, 5).map((row, ri) => {
                    const s = rowToSystem(row);
                    return (
                      <tr key={ri}>
                        {IMPORT_FIELDS.map((f) => (
                          <td key={f.key} style={{ padding: '6px 8px' }}>
                            {s[f.key] || <span style={{ color: 'var(--gf-glaciar-gray)' }}>—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && <Hint kind="error">{error}</Hint>}

            <div className="gf-actions">
              <button type="button" className="gf-btn gf-btn-ghost" onClick={() => setMatrix(null)}>
                ← Andere Datei
              </button>
              <button type="button" className="gf-btn gf-btn-primary" onClick={doImport}>
                {dataRows.length} Zeile{dataRows.length === 1 ? '' : 'n'} übernehmen
              </button>
            </div>
          </>
        )}

        {error && !matrix && <Hint kind="error">{error}</Hint>}
      </div>
    </div>
  );
}
