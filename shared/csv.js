/**
 * Erzeugung der CSV-Dateien im Format der bestehenden GF-Anlagenliste.
 *
 * - Trennzeichen: Semikolon (";") – Standard für deutsches Excel.
 * - Verbrauchswerte stehen IMMER in kWh (bereits umgerechnet, siehe conversion.js).
 * - Es wird ein UTF-8 BOM vorangestellt, damit Umlaute in Excel korrekt erscheinen.
 */

import { consumptionToKwh } from './conversion.js';

const SEP = ';';
const BOM = '﻿';

/** Maskiert ein einzelnes CSV-Feld nach RFC 4180 (mit ; als Trenner). */
function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(SEP) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function rowToLine(cells) {
  return cells.map(csvCell).join(SEP);
}

function jaNein(v) {
  if (v === true || v === 'ja' || v === 'Ja') return 'Ja';
  if (v === false || v === 'nein' || v === 'Nein') return 'Nein';
  return '';
}

/**
 * CSV für "Standard Business Case".
 * Spaltenreihenfolge exakt nach Abschnitt 7 der Aufgabe.
 */
export function buildStandardCsv(data) {
  const headers = [
    'Nr.',
    'Straße & Hausnr. Heizungsanlage',
    'Versorgte Gebäude',
    'PLZ',
    'Stadt',
    'Heizungstyp',
    'Unterstation (Anzahl)',
    'Leistung kW',
    'Modell/Info',
    'Fernwärme-Anschlussleistung kW',
    'Zentrales Warmwasser',
    'Wohneinheiten',
    'Baujahr/Sanierung',
    'Beheizte Fläche m²',
    'Besonderheiten',
    'Verbrauch letztes Jahr (kWh)',
    'Verbrauch vorletztes Jahr (kWh)',
    'Verbrauch vor-vorletztes Jahr (kWh)',
    'Hauswart/Kontakt',
    'Telefon',
  ];

  const lines = [rowToLine(headers)];

  (data.systems || []).forEach((s, i) => {
    lines.push(
      rowToLine([
        i + 1,
        s.streetHeating,
        s.suppliedBuildings,
        s.plz,
        s.city,
        s.heatingType,
        s.substationPresent ? s.substationCount : '',
        s.powerKw,
        s.modelInfo,
        s.heatingType === 'Fernwärme' ? s.districtHeatingConnectionKw : '',
        jaNein(s.centralHotWater),
        s.residentialUnits,
        s.constructionYear,
        s.heatedAreaM2,
        s.specialNotes,
        consumptionToKwh(s.consumptionLastYear, s.heatingType) ?? '',
        consumptionToKwh(s.consumptionPrevYear, s.heatingType) ?? '',
        consumptionToKwh(s.consumptionPrevPrevYear, s.heatingType) ?? '',
        s.caretakerContact,
        s.caretakerPhone,
      ]),
    );
  });

  return BOM + lines.join('\r\n');
}

/**
 * CSV für "Sektorkopplung".
 * Eigene Spalten für die Komponenten (Abschnitt 7, zweiter Absatz).
 */
export function buildSektorkopplungCsv(data) {
  const headers = [
    'Nr.',
    'Straße & Hausnr. Heizungsanlage',
    'Versorgte Gebäude',
    'PLZ',
    'Stadt',
    'Wohneinheiten',
    'Hauswart',
    'Telefon',
    'Wärmepumpe (Hersteller/Modell)',
    'Wärmepumpe Anzahl',
    'Wärmepumpe kW',
    'Heizstab Anzahl',
    'Heizstab kW',
    'Pufferspeicher Anzahl',
    'Pufferspeicher Liter',
    'PV-Wechselrichter (Hersteller/Modell)',
    'PV Anzahl',
    'PV kWp',
    'Batterie-Wechselrichter (Hersteller/Modell)',
    'Batterie Anzahl',
    'Batterie kWh',
    'Status/Freigabe',
    'Installateur PV',
    'Installateur Wärmepumpe',
    'PV-Nutzungskonzept',
    'Internet',
    'Kommentar',
  ];

  const c = data.components || {};
  const has = (key) => Array.isArray(data.selectedComponents) && data.selectedComponents.includes(key);

  const line = rowToLine([
    1,
    data.streetHeating,
    data.suppliedBuildings,
    data.plz,
    data.city,
    data.residentialUnits,
    data.caretakerName,
    data.caretakerPhone,
    has('waermepumpe') ? c.heatPumpModel : '',
    has('waermepumpe') ? c.heatPumpCount : '',
    has('waermepumpe') ? c.heatPumpKw : '',
    has('heizstab') ? c.heatingRodCount : '',
    has('heizstab') ? c.heatingRodKw : '',
    has('pufferspeicher') ? c.bufferCount : '',
    has('pufferspeicher') ? c.bufferLiters : '',
    has('pv') ? c.pvInverterModel : '',
    has('pv') ? c.pvCount : '',
    has('pv') ? c.pvKwp : '',
    has('batterie') ? c.batteryInverterModel : '',
    has('batterie') ? c.batteryCount : '',
    has('batterie') ? c.batteryKwh : '',
    data.installationStatus,
    data.installerPv,
    data.installerHeatPump,
    data.pvUsageConcept,
    data.internetProvision,
    data.comment,
  ]);

  return BOM + [rowToLine(headers), line].join('\r\n');
}
