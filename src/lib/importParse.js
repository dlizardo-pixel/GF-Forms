/**
 * Hilfsfunktionen für den Import aus Excel/CSV (oder eingefügtem Text).
 *
 * Ziel: Format-Kopfschmerzen vermeiden. Wir lesen die Rohdaten als Tabelle ein,
 * erkennen Ausrichtung, Überschriftenzeile und Spalten automatisch und lassen
 * den Kunden die Zuordnung vor dem Import in einer Vorschau prüfen/korrigieren.
 */

// Zielfelder, die wir aus einer Liste übernehmen können (Kernfelder).
export const IMPORT_FIELDS = [
  {
    key: 'streetHeating',
    label: 'Straße & Hausnr.',
    keywords: ['straße', 'strasse', 'str.', 'str ', 'adresse', 'anschrift', 'hausnr', 'hausnummer', 'standort', 'objekt', 'liegenschaft', 'gebäude', 'gebaeude'],
  },
  { key: 'plz', label: 'PLZ', keywords: ['plz', 'postleitzahl'] },
  { key: 'city', label: 'Stadt', keywords: ['stadt', 'ort'] },
  {
    key: 'heatingType',
    label: 'Heizung',
    keywords: ['heizung', 'heizungstyp', 'heizungsart', 'energieträger', 'energietraeger', 'wärmeerz', 'waermeerz', 'wärmeerzeuger', 'brennstoff', 'zentralheizung', 'medium'],
  },
  {
    key: 'heatedAreaM2',
    label: 'Fläche (m²)',
    keywords: ['fläche', 'flaeche', 'm²', 'm2', 'qm', 'quadratmeter', 'wohnfläche', 'wohnflaeche', 'nutzfläche', 'nutzflaeche', 'ngf', 'wfl', 'beheizt'],
  },
  {
    key: 'consumptionLastYear',
    label: 'Verbrauch letztes Jahr',
    keywords: ['verbrauch', 'jahresverbrauch', 'gasverbrauch', 'heizverbrauch', 'kwh', 'm³', 'm3', 'wärmemenge', 'waermemenge', 'endenergie'],
  },
];

// Reihenfolge für den Fall „ohne Überschrift" (positionsbasiert).
const POSITIONAL = IMPORT_FIELDS.map((f) => f.key);

/**
 * Vereinheitlicht Text für robuste Vergleiche: Kleinschreibung, Umlaute falten
 * (ä→ae …), hochgestelltes ²/³ ersetzen, alles Übrige außer a–z/0–9 entfernen.
 * So matchen „Straße"↔„Strasse" und „m²"↔„m2".
 */
export function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '');
}

// Normalisierte Stichwörter je Feld einmalig vorberechnen.
IMPORT_FIELDS.forEach((f) => {
  f._nkw = [...new Set(f.keywords.map(normalizeText).filter(Boolean))];
});

/** Treffer-Score eines normalisierten Headers für ein Feld (= Länge des spezifischsten Treffers). */
function fieldScore(normalizedCell, field) {
  let best = 0;
  for (const k of field._nkw) {
    if (normalizedCell.includes(k)) best = Math.max(best, k.length);
  }
  return best;
}

/** Wie viele verschiedene Zielfelder trifft diese Zellenreihe (potenzielle Überschrift)? */
function lineFieldHits(cells) {
  let hits = 0;
  for (const f of IMPORT_FIELDS) {
    if (cells.some((c) => fieldScore(normalizeText(c), f) > 0)) hits += 1;
  }
  return hits;
}

/** Trennzeichen einer eingefügten Tabelle erraten (Tab → Semikolon → Komma). */
function detectDelimiter(line) {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  if (line.includes(',')) return ',';
  return '\t';
}

/** Eingefügten Text in eine Matrix (Zeilen × Zellen) umwandeln. */
export function parseText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];
  const delim = detectDelimiter(lines[0]);
  return lines.map((l) => l.split(delim).map((c) => c.trim()));
}

/** Matrix transponieren (Zeilen ↔ Spalten). */
export function transpose(matrix) {
  const colCount = Math.max(0, ...matrix.map((r) => r.length));
  const out = [];
  for (let c = 0; c < colCount; c++) out.push(matrix.map((r) => r[c] ?? ''));
  return out;
}

/**
 * Ausrichtung erkennen: Stehen die Feldnamen eher in einer Zeile (normal) oder
 * senkrecht in einer Spalte (gedrehte Tabelle)? Liefert 'rows' | 'columns'.
 */
export function detectOrientation(matrix) {
  if (!matrix || matrix.length === 0) return 'rows';
  const rLimit = Math.min(matrix.length, 20);
  let rowBest = 0;
  for (let r = 0; r < rLimit; r++) rowBest = Math.max(rowBest, lineFieldHits(matrix[r] || []));

  const colCount = Math.max(0, ...matrix.map((r) => r.length));
  const cLimit = Math.min(colCount, 20);
  let colBest = 0;
  for (let c = 0; c < cLimit; c++) {
    const col = matrix.map((r) => r[c]).filter((x) => x != null);
    colBest = Math.max(colBest, lineFieldHits(col));
  }
  return colBest > rowBest ? 'columns' : 'rows';
}

/**
 * Sucht die Überschriftenzeile in den ersten ~20 Zeilen (Überschriften stehen
 * oft erst in Zeile 3/4). Liefert den Zeilenindex oder -1, wenn keine gefunden.
 */
export function findHeaderRow(matrix) {
  const limit = Math.min(matrix.length, 20);
  let bestRow = -1;
  let bestHits = 1; // Schwelle: mindestens 2 Treffer
  for (let r = 0; r < limit; r++) {
    const hits = lineFieldHits(matrix[r] || []);
    if (hits > bestHits) {
      bestHits = hits;
      bestRow = r;
    }
  }
  return bestRow;
}

/** Kompatibilitäts-Helfer: Sieht die Zeile wie eine Überschrift aus? */
export function looksLikeHeader(row) {
  return lineFieldHits(row || []) >= 2;
}

/** Deutsche/gemischte Zahlenformate säubern → maschinenlesbarer String. */
export function cleanNumber(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return '';
  s = s.replace(/[^\d.,-]/g, ''); // Einheiten, Leerzeichen entfernen
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.'); // 1.200,5 → 1200.5
  } else if (s.includes(',')) {
    s = s.replace(',', '.'); // 1200,5 → 1200.5
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // 1.200 → 1200 (Tausenderpunkt)
  }
  return s;
}

/** Heizungs-Begriff locker auf unsere Werte abbilden (umlaut-/schreibweise-tolerant). */
const HEATING_SYNONYMS = {
  gas: 'Gas zentral',
  'gas zentral': 'Gas zentral',
  erdgas: 'Gas zentral',
  gasheizung: 'Gas zentral',
  gaskessel: 'Gas zentral',
  gasbrennwert: 'Gas zentral',
  zentralheizung: 'Gas zentral',
  flüssiggas: 'Gas zentral',
  bhkw: 'Gas zentral',
  blockheizkraftwerk: 'Gas zentral',
  gaskombi: 'Gaskombi',
  'gas-kombi': 'Gaskombi',
  kombitherme: 'Gaskombi',
  etagenheizung: 'Gaskombi',
  fernwärme: 'Fernwärme',
  fernwaerme: 'Fernwärme',
  nahwärme: 'Fernwärme',
  nahwaerme: 'Fernwärme',
  fw: 'Fernwärme',
  wärmepumpe: 'Wärmepumpe',
  waermepumpe: 'Wärmepumpe',
  wp: 'Wärmepumpe',
  'luft-wasser': 'Wärmepumpe',
  luftwasser: 'Wärmepumpe',
  sole: 'Wärmepumpe',
  erdwärme: 'Wärmepumpe',
  öl: 'Öl',
  oel: 'Öl',
  ölheizung: 'Öl',
  heizöl: 'Öl',
  ölkessel: 'Öl',
  pellets: 'Holz-Pellets',
  'holz-pellets': 'Holz-Pellets',
  holz: 'Holz-Pellets',
  hackschnitzel: 'Holz-Pellets',
  scheitholz: 'Holz-Pellets',
  biomasse: 'Holz-Pellets',
};

// Normalisierte Synonyme, längste zuerst (für Teilstring-Treffer in zusammengesetzten Begriffen).
const NORM_SYNONYMS = Object.entries(HEATING_SYNONYMS)
  .map(([k, v]) => [normalizeText(k), v])
  .sort((a, b) => b[0].length - a[0].length);

export function normalizeHeating(raw, allowed) {
  const v = String(raw || '').trim();
  if (!v) return '';
  const nv = normalizeText(v);
  const exact = (allowed || []).find((h) => normalizeText(h) === nv);
  if (exact) return exact;
  for (const [k, val] of NORM_SYNONYMS) {
    if (k && (nv === k || nv.includes(k))) return val;
  }
  return v;
}

/**
 * Automatische Spaltenzuordnung per Scoring: spezifischere (längere)
 * Stichwort-Treffer gewinnen; jede Spalte/jedes Feld wird höchstens einmal
 * vergeben. Fällt auf positionsbasiert zurück, wenn keine Überschrift erkannt.
 * @param {string[]} header – Überschriftenzeile (oder erste Datenzeile)
 * @param {boolean} hasHeader – ob `header` echte Überschriften enthält
 * @returns {Object} Zuordnung { zielfeld: spaltenIndex }
 */
export function guessMapping(header, hasHeader) {
  if (hasHeader) {
    const norm = header.map(normalizeText);
    const cands = [];
    IMPORT_FIELDS.forEach((f) => {
      norm.forEach((h, ci) => {
        const sc = fieldScore(h, f);
        if (sc > 0) cands.push({ key: f.key, ci, sc });
      });
    });
    cands.sort((a, b) => b.sc - a.sc);
    const map = {};
    const usedCol = new Set();
    const usedField = new Set();
    for (const c of cands) {
      if (usedField.has(c.key) || usedCol.has(c.ci)) continue;
      map[c.key] = c.ci;
      usedField.add(c.key);
      usedCol.add(c.ci);
    }
    if (Object.keys(map).length > 0) return map;
  }
  const map = {};
  POSITIONAL.forEach((key, i) => {
    if (i < header.length) map[key] = i;
  });
  return map;
}
