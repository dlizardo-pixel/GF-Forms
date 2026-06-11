/**
 * Hilfsfunktionen für den Import aus Excel/CSV (oder eingefügtem Text).
 *
 * Ziel: Format-Kopfschmerzen vermeiden. Wir lesen die Rohdaten als Tabelle ein,
 * erkennen die Spalten automatisch anhand der Überschriften und lassen den
 * Kunden die Zuordnung vor dem Import prüfen/korrigieren.
 */

// Zielfelder, die wir aus einer Liste übernehmen können (Kernfelder).
export const IMPORT_FIELDS = [
  {
    key: 'streetHeating',
    label: 'Straße & Hausnr.',
    keywords: ['straße', 'strasse', 'str.', 'str ', 'adresse', 'anschrift', 'hausnr', 'standort', 'objekt', 'liegenschaft'],
  },
  { key: 'plz', label: 'PLZ', keywords: ['plz', 'postleitzahl'] },
  { key: 'city', label: 'Stadt', keywords: ['stadt', 'ort'] },
  {
    key: 'heatingType',
    label: 'Heizung',
    keywords: ['heizung', 'energieträger', 'energietraeger', 'wärmeerz', 'waermeerz', 'brennstoff', 'medium'],
  },
  {
    key: 'heatedAreaM2',
    label: 'Fläche (m²)',
    keywords: ['fläche', 'flaeche', 'm²', 'm2', 'qm', 'wohnfläche', 'wohnflaeche', 'beheizt'],
  },
  {
    key: 'consumptionLastYear',
    label: 'Verbrauch letztes Jahr',
    keywords: ['verbrauch', 'kwh', 'm³', 'm3', 'jahresverbrauch', 'wärmemenge', 'waermemenge', 'energie'],
  },
];

// Reihenfolge für den Fall „ohne Überschrift" (positionsbasiert).
const POSITIONAL = IMPORT_FIELDS.map((f) => f.key);

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

/** Heizungs-Begriff locker auf unsere Werte abbilden. */
const HEATING_SYNONYMS = {
  gas: 'Gas zentral',
  'gas zentral': 'Gas zentral',
  erdgas: 'Gas zentral',
  gaskombi: 'Gaskombi',
  'gas-kombi': 'Gaskombi',
  kombitherme: 'Gaskombi',
  fernwärme: 'Fernwärme',
  fernwaerme: 'Fernwärme',
  fw: 'Fernwärme',
  wärmepumpe: 'Wärmepumpe',
  waermepumpe: 'Wärmepumpe',
  wp: 'Wärmepumpe',
  öl: 'Öl',
  oel: 'Öl',
  ölheizung: 'Öl',
  heizöl: 'Öl',
  pellets: 'Holz-Pellets',
  'holz-pellets': 'Holz-Pellets',
  holz: 'Holz-Pellets',
};

export function normalizeHeating(raw, allowed) {
  const v = String(raw || '').trim();
  if (!v) return '';
  const hit = (allowed || []).find((h) => h.toLowerCase() === v.toLowerCase());
  if (hit) return hit;
  return HEATING_SYNONYMS[v.toLowerCase()] || v;
}

/** Prüft, ob die erste Zeile sehr wahrscheinlich eine Überschrift ist. */
export function looksLikeHeader(row) {
  if (!row) return false;
  let matches = 0;
  for (const cell of row) {
    const c = String(cell).toLowerCase();
    if (IMPORT_FIELDS.some((f) => f.keywords.some((k) => c.includes(k)))) matches += 1;
  }
  return matches >= 2;
}

/**
 * Automatische Spaltenzuordnung.
 * @param {string[]} header – Überschriftenzeile (oder erste Datenzeile)
 * @param {boolean} hasHeader – ob die erste Zeile Überschriften enthält
 * @returns {Object} Zuordnung { zielfeld: spaltenIndex }
 */
export function guessMapping(header, hasHeader) {
  const map = {};
  if (hasHeader) {
    const used = new Set();
    for (const f of IMPORT_FIELDS) {
      for (let ci = 0; ci < header.length; ci++) {
        if (used.has(ci)) continue;
        const h = String(header[ci]).toLowerCase();
        if (f.keywords.some((k) => h.includes(k))) {
          map[f.key] = ci;
          used.add(ci);
          break;
        }
      }
    }
    if (Object.keys(map).length > 0) return map;
  }
  // Fallback: positionsbasiert
  POSITIONAL.forEach((key, i) => {
    if (i < header.length) map[key] = i;
  });
  return map;
}
