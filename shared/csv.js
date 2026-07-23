/**
 * Erzeugung der CSV-Dateien im Format der bestehenden GF-Anlagenliste.
 *
 * - Trennzeichen: Semikolon (";") – Standard für deutsches Excel.
 * - Verbrauchswerte stehen IMMER in kWh (bereits umgerechnet, siehe conversion.js).
 * - Es wird ein UTF-8 BOM vorangestellt, damit Umlaute in Excel korrekt erscheinen.
 */

import { consumptionToKwh } from './conversion.js';
import { formatComponentStatus, formatOtherHeatSources, formatPvOperator, jaNein as jaNeinLbl } from './sektorLabels.js';

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
    'Einsparberechnung gewünscht',
    'Jährl. Wärmebedarf (kWh)',
    'Mieterstromteilnehmer',
    'Strompreis (€/kWh)',
    'Komponenten (Status)',
    'Wärmepumpe (Hersteller)',
    'WP-Regler/Controller',
    'WP-Topologie',
    'WP Anzahl',
    'WP kW (elektrisch)',
    'WP Haupterzeuger',
    'Weitere Wärmeerzeuger',
    'Heizstab Anzahl',
    'Heizstab kW',
    'Pufferspeicher Anzahl',
    'Pufferspeicher Liter',
    'PV-Wechselrichter Hersteller',
    'PV-Wechselrichter Modell/Serie',
    'PV kWp',
    'PV-Nutzung',
    'PV-Betreiber',
    'Batterie-Wechselrichter (Hersteller/Modell)',
    'Batterie Anzahl',
    'Batterie kWh',
    'Anderes EMS/GLT',
    'EMS nutzt Modbus',
    'Zeithorizont (Planung)',
    'Kommentar',
  ];

  const sites = Array.isArray(data.sites) ? data.sites : [data]; // Rückwärtskompatibel zum Einzel-Anlagen-Format
  const siteLine = (site, nr) => {
    const c = site.components || {};
    const has = (key) => Array.isArray(site.selectedComponents) && site.selectedComponents.includes(key);
    return rowToLine([
      nr,
      site.streetHeating,
      site.suppliedBuildings,
      site.plz,
      site.city,
      site.residentialUnits,
      jaNeinLbl(site.calcSavings),
      site.calcSavings === true ? site.annualHeatDemandKwh : '',
      site.calcSavings === true ? site.tenantPowerParticipants : '',
      site.calcSavings === true ? site.electricityPriceEurKwh : '',
      formatComponentStatus(site),
      has('waermepumpe') ? c.heatPumpModel : '',
      has('waermepumpe') ? c.heatPumpController : '',
      has('waermepumpe') ? c.heatPumpTopology : '',
      has('waermepumpe') ? c.heatPumpCount : '',
      has('waermepumpe') ? c.heatPumpKw : '',
      has('waermepumpe') ? jaNeinLbl(site.wpIsMainHeater) : '',
      formatOtherHeatSources(site),
      has('heizstab') ? c.heatingRodCount : '',
      has('heizstab') ? c.heatingRodKw : '',
      has('pufferspeicher') ? c.bufferCount : '',
      has('pufferspeicher') ? c.bufferLiters : '',
      has('pv') ? c.pvInverterManufacturer : '',
      has('pv') ? c.pvInverterModel : '',
      has('pv') ? c.pvKwp : '',
      has('pv') ? site.pvUsage : '',
      has('pv') ? formatPvOperator(site) : '',
      has('batterie') ? c.batteryInverterModel : '',
      has('batterie') ? c.batteryCount : '',
      has('batterie') ? c.batteryKwh : '',
      jaNeinLbl(site.existingEms),
      site.existingEms === true ? site.existingEmsModbus : '',
      site.planningHorizon,
      site.comment,
    ]);
  };

  const lines = [rowToLine(headers), ...sites.map((site, i) => siteLine(site, i + 1))];
  return BOM + lines.join('\r\n');
}
