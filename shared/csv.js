/**
 * Erzeugung der CSV-Dateien im Format der bestehenden GF-Anlagenliste.
 *
 * - Trennzeichen: Semikolon (";") – Standard für deutsches Excel.
 * - Verbrauchswerte stehen IMMER in kWh (bereits umgerechnet, siehe conversion.js).
 * - Es wird ein UTF-8 BOM vorangestellt, damit Umlaute in Excel korrekt erscheinen.
 */

import { consumptionToKwh } from './conversion.js';
import { ALL_COLUMNS, buildSektorRows } from './sektorExport.js';

const SEP = ';';
const BOM = '﻿';

/** Maskiert ein einzelnes CSV-Feld nach RFC 4180. */
function csvCell(value, sep = SEP) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(sep) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowToLine(cells, sep = SEP) {
  return cells.map((c) => csvCell(c, sep)).join(sep);
}

/**
 * CSV für "Standard Business Case".
 * Spaltenreihenfolge exakt nach Abschnitt 7 der Aufgabe.
 */
export function buildStandardCsv(data) {
  const headers = [
    'Nr.',
    'Straße & Hausnr. Heizungsanlage',
    'Mehrere Gebäude / Unterstationen (Anzahl)',
    'PLZ',
    'Stadt',
    'Heizungstyp',
    'Fernwärme-Anschlussleistung kW',
    'Wohneinheiten',
    'Beheizte Fläche m²',
    'Besonderheiten',
    'Verbrauch letztes Jahr (kWh)',
    'Verbrauch vorletztes Jahr (kWh)',
    'Hauswart/Kontakt',
    'Telefon',
  ];

  // Kombinierte Frage „mehrere Gebäude/Unterstationen?": Anzahl, sonst Ja/Nein.
  const supply = (s) => (s.multiSupply === true ? (s.supplyCount || 'Ja') : s.multiSupply === false ? 'Nein' : '');
  // Heizungstyp(en) als lesbarer Text inkl. Freitext.
  const heating = (s) => [...(s.heatingTypes || []), s.heatingTypeOther].filter(Boolean).join(', ');
  const isFernwaerme = (s) => Array.isArray(s.heatingTypes) && s.heatingTypes.includes('Fernwärme');

  const lines = [rowToLine(headers)];

  (data.systems || []).forEach((s, i) => {
    lines.push(
      rowToLine([
        i + 1,
        s.streetHeating,
        supply(s),
        s.plz,
        s.city,
        heating(s),
        isFernwaerme(s) ? s.districtHeatingConnectionKw : '',
        s.residentialUnits,
        s.heatedAreaM2,
        s.specialNotes,
        consumptionToKwh(s.consumptionLastYear, s.heatingTypes) ?? '',
        consumptionToKwh(s.consumptionPrevYear, s.heatingTypes) ?? '',
        s.caretakerContact,
        s.caretakerPhone,
      ]),
    );
  });

  return BOM + lines.join('\r\n');
}

/**
 * CSV für "Sektorkopplung".
 *
 * Format = Spalten des bisherigen Google-Formulars „Technischer Fragebogen
 * Sektorkopplung (Antworten)" (siehe shared/sektorExport.js), zusätzliche
 * GF-Forms-Felder hinten angehängt. Eine Zeile je Anlage.
 *
 * Trennzeichen ist hier bewusst das KOMMA (nicht das Semikolon wie in der
 * klassischen Anlagenliste): Die Datei soll sich 1:1 in dasselbe Sheet
 * einfügen lassen wie der bisherige Formular-Export, und der ist
 * kommasepariert.
 */
export function buildSektorkopplungCsv(data, { gfContact = '', now = new Date() } = {}) {
  const rows = buildSektorRows(data, { gfContact, now });
  const lines = [
    rowToLine(ALL_COLUMNS, ','),
    ...rows.map((row) => rowToLine(ALL_COLUMNS.map((col) => row[col]), ',')),
  ];
  return BOM + lines.join('\r\n');
}
