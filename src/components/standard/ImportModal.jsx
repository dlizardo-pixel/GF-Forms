import { useMemo, useState } from 'react';
import readXlsxFile, { readSheetNames } from 'read-excel-file';
import { Hint } from '../Fields.jsx';
import { makeSystem } from '../../lib/standardModel.js';
import { HEATING_TYPES } from '../../lib/options.js';
import {
  IMPORT_FIELDS,
  parseText,
  cleanNumber,
  normalizeHeating,
  detectOrientation,
  transpose,
  findHeaderRow,
  guessMapping,
} from '../../lib/importParse.js';

/**
 * Import-Dialog: Excel-/CSV-Datei hochladen ODER Tabelle einfügen.
 *
 * Die Anwendung erkennt automatisch:
 *  - das Tabellenblatt (bei mehreren Sheets wählbar),
 *  - ob die Tabelle gedreht ist (Felder in Spalten statt Zeilen),
 *  - in welcher Zeile die Überschrift steht (auch Zeile 3/4),
 *  - welche Spalte zu welchem Feld gehört.
 * Alles ist manuell korrigierbar; die Vorschau zeigt das Ergebnis vor dem Import.
 */
export default function ImportModal({ project, onImport, onClose }) {
  const [rawMatrix, setRawMatrix] = useState(null);
  const [file, setFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [transposed, setTransposed] = useState(false);
  const [headerRowIndex, setHeaderRowIndex] = useState(-1);
  const [mapping, setMapping] = useState({});
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  // Roh-Tabelle übernehmen und alles automatisch erkennen.
  function applyMatrix(rows, name) {
    const clean = (rows || [])
      .map((r) => (Array.isArray(r) ? r.map((c) => (c == null ? '' : c)) : [r]))
      .filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
    if (clean.length === 0) {
      setError('Wir konnten keine Tabellenzeilen erkennen. Bitte prüfen Sie Datei oder Text.');
      return;
    }
    const trans = detectOrientation(clean) === 'columns';
    const work = trans ? transpose(clean) : clean;
    const hr = findHeaderRow(work);
    const header = (hr >= 0 ? work[hr] : work[0] || []).map(String);
    setRawMatrix(clean);
    setTransposed(trans);
    setHeaderRowIndex(hr);
    setMapping(guessMapping(header, hr >= 0));
    setFileName(name || '');
    setError('');
  }

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setFile(f);
    try {
      if (f.name.toLowerCase().endsWith('.xlsx')) {
        let names = [];
        try {
          names = await readSheetNames(f);
        } catch {
          names = [];
        }
        setSheetNames(names);
        const sheet = names[0] || 1;
        setSelectedSheet(names[0] || '');
        const rows = await readXlsxFile(f, { sheet });
        applyMatrix(rows, f.name);
      } else {
        setSheetNames([]);
        const text = await f.text();
        applyMatrix(parseText(text), f.name);
      }
    } catch (err) {
      setError('Diese Datei ließ sich nicht lesen (' + err.message + '). Tipp: als .xlsx oder .csv speichern, oder die Tabelle unten einfügen.');
    }
  }

  async function changeSheet(name) {
    if (!file) return;
    setSelectedSheet(name);
    try {
      const rows = await readXlsxFile(file, { sheet: name });
      applyMatrix(rows, fileName);
    } catch (err) {
      setError('Dieses Tabellenblatt ließ sich nicht lesen (' + err.message + ').');
    }
  }

  function handlePaste() {
    applyMatrix(parseText(pasteText), '');
  }

  // Abgeleitete Sicht auf die Daten (gedreht/Überschriftenzeile berücksichtigt).
  const workMatrix = useMemo(
    () => (rawMatrix ? (transposed ? transpose(rawMatrix) : rawMatrix) : null),
    [rawMatrix, transposed],
  );
  const hasHeader = headerRowIndex >= 0;
  const colCount = workMatrix ? Math.max(0, ...workMatrix.map((r) => r.length)) : 0;
  const header = workMatrix ? (hasHeader ? workMatrix[headerRowIndex] : []).map((c) => String(c ?? '')) : [];
  const dataRows = useMemo(() => {
    if (!workMatrix) return [];
    return hasHeader ? workMatrix.slice(headerRowIndex + 1) : workMatrix;
  }, [workMatrix, hasHeader, headerRowIndex]);

  // Manuelle Korrekturen → Zuordnung neu erraten.
  function applyTransposed(next) {
    setTransposed(next);
    const work = next ? transpose(rawMatrix) : rawMatrix;
    const hr = findHeaderRow(work);
    setHeaderRowIndex(hr);
    const h = (hr >= 0 ? work[hr] : work[0] || []).map(String);
    setMapping(guessMapping(h, hr >= 0));
  }
  function applyHeaderRow(n) {
    setHeaderRowIndex(n);
    const h = (n >= 0 ? workMatrix[n] : workMatrix[0] || []).map(String);
    setMapping(guessMapping(h, n >= 0));
  }

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

  function reset() {
    setRawMatrix(null);
    setFile(null);
    setSheetNames([]);
    setSelectedSheet('');
    setError('');
  }

  return (
    <div className="gf-modal-overlay" onClick={onClose}>
      <div className="gf-card gf-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Liste importieren</h3>

        {!rawMatrix && (
          <>
            <p className="gf-help" style={{ marginTop: 0 }}>
              Laden Sie Ihre vorhandene Liste als <strong>Excel (.xlsx)</strong> oder <strong>CSV</strong> hoch –
              die Spalten müssen nicht in einer bestimmten Reihenfolge sein, wir erkennen sie automatisch (auch
              wenn die Überschrift erst weiter unten steht oder die Tabelle gedreht ist) und zeigen Ihnen vorher
              eine Vorschau.
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
            {error && <Hint kind="error">{error}</Hint>}
          </>
        )}

        {rawMatrix && (
          <>
            {fileName && <p className="gf-help" style={{ marginTop: 0 }}>Datei: {fileName}</p>}

            {/* Tabellenblatt-Auswahl bei mehreren Sheets */}
            {sheetNames.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>Tabellenblatt</span>
                <select className="gf-select" value={selectedSheet} onChange={(e) => changeSheet(e.target.value)}>
                  {sheetNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, marginBottom: 8 }}>
              <input type="checkbox" checked={transposed} onChange={(e) => applyTransposed(e.target.checked)} />
              Tabelle ist gedreht (Felder stehen in Spalten)
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 14 }}>Überschrift in Zeile</span>
              <select
                className="gf-select"
                value={headerRowIndex}
                onChange={(e) => applyHeaderRow(Number(e.target.value))}
              >
                <option value={-1}>(keine Überschrift)</option>
                {workMatrix.slice(0, 20).map((row, ri) => (
                  <option key={ri} value={ri}>
                    Zeile {ri + 1}: {row.filter((c) => String(c).trim()).slice(0, 3).join(' · ').slice(0, 50)}
                  </option>
                ))}
              </select>
            </div>

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
              <button type="button" className="gf-btn gf-btn-ghost" onClick={reset}>
                ← Andere Datei
              </button>
              <button type="button" className="gf-btn gf-btn-primary" onClick={doImport}>
                {dataRows.length} Zeile{dataRows.length === 1 ? '' : 'n'} übernehmen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
