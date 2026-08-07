/**
 * Einheitliche Abbildung einer Sektorkopplungs-Anlage auf das Spaltenformat des
 * bisherigen Google-Formulars „Technischer Fragebogen Sektorkopplung
 * (Antworten)".
 *
 * WICHTIG — dieses Format ist verbindlich:
 *  - Spaltennamen zeichengenau, inklusive der drei Namen mit abschließendem
 *    LEERZEICHEN ('Andere Wärmeerzeuger ', 'PV-Anlage Konfiguration ',
 *    'PV-Partner ') und der leeren Spalte hinter „Spalte 19". Bitte NICHT
 *    „aufräumen": Sowohl der n8n-Flow („TF Survey to SC Project List") als auch
 *    das Auswertungs-Sheet greifen die Spalten über genau diese Namen ab.
 *  - Auch die ANTWORTEN müssen wörtlich der Auswahl des alten Formulars
 *    entsprechen (z. B. „Installiert & in Betrieb"), sonst greifen Filter und
 *    Pivot-Auswertungen im Sheet nicht.
 *
 * Zusätzliche Felder, die GF-Forms erfasst und das alte Formular nicht kannte,
 * stehen in EXTRA_COLUMNS — also hinten angehängt, nie zwischen den Spalten
 * oben. So bleibt das Format kompatibel und es geht trotzdem nichts verloren.
 *
 * CSV-Erzeugung (shared/csv.js) und n8n-Weitergabe (shared/n8n.js) nutzen
 * beide `buildSektorRow()`, damit die beiden Wege nicht auseinanderlaufen.
 */

import { formatOtherHeatSources, formatPvOperator } from './sektorLabels.js';
import { siteHeatPumps, heatPumpName, joinHeatPumpField } from './heatPumps.js';

/** Spalten des Google-Formulars – Reihenfolge und Schreibweise verbindlich. */
export const FORM_COLUMNS = [
  'Zeitstempel',
  'Ihr Ansprechpartner bei Green Fusion',
  'Ihr Unternehmen',
  'Adressen aller Gebäude mit gleichen Eigenschaften',
  'Hersteller der Wärmepumpe',
  'Wärmepumpen Controller (Modell- oder Serienname, z.B. ISG-Web)',
  'Wärmepumpen-Konfiguration',
  'Andere Wärmeerzeuger ',
  'Status Wärmepumpen-System',
  'PV-Wechselrichter Hersteller',
  'PV-Wechselrichter Modell / Serie',
  'Status PV-Anlage',
  'PV-Anlage Konfiguration ',
  'Nutzung von PV-Strom in ihrem Gebäude?',
  'Berechnung der Einsparpotenziale (optional)',
  'PV-Partner ',
  'Gibt es ein Gebäudeleittechnik (GLT)-System oder Energiemonitoring/managementsystem (EMS) in ihrem Gebäude?',
  'Was für einen Stromzähler hängt vor der Wärmepumpe?',
  'Was für Stromzähler gibt es bei Ihnen für der Wärmepumpe?',
  'Nutzung von PV-Strom in ihrem Gebäude? 2',
  'Status Wärmepumpen-System (alt)',
  'Spalte 19',
  '',
  'Bewertung',
];

/** Zusätzliche Angaben aus GF-Forms – immer HINTER den Formularspalten. */
export const EXTRA_COLUMNS = [
  'Anlage Nr.',
  'Einreichung',
  'Straße & Hausnr. Heizungsanlage',
  'PLZ',
  'Stadt',
  'Versorgte Gebäude',
  'Wohneinheiten',
  'Wärmepumpen (Typen)',
  'Wärmepumpe (Modell/Typ)',
  'WP Anzahl',
  'WP kW (elektrisch)',
  'WP Haupterzeuger',
  'Weitere Wärmeerzeuger (Details)',
  'Heizstab Anzahl',
  'Heizstab kW',
  'Pufferspeicher Anzahl',
  'Pufferspeicher Liter',
  'Batterie-Wechselrichter (Hersteller/Modell)',
  'Batterie Anzahl',
  'Batterie kWh',
  'EMS nutzt Modbus',
  'Zeithorizont (Planung)',
  'Jährl. Wärmebedarf (kWh)',
  'Mieterstromteilnehmer',
  'Strompreis (€/kWh)',
  'Ansprechpartner (Kunde)',
  'E-Mail (Kunde)',
  'Telefon (Kunde)',
  'Kommentar',
];

export const ALL_COLUMNS = [...FORM_COLUMNS, ...EXTRA_COLUMNS];

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const has = (site, key) => Array.isArray(site.selectedComponents) && site.selectedComponents.includes(key);
const status = (site, key) => (site.componentStatus || {})[key];

// ---------------------------------------------------------------------------
// Antworten in der Wortwahl des alten Formulars
// ---------------------------------------------------------------------------

/**
 * „Installiert & in Betrieb" / „Inbetriebnahme … geplant".
 *
 * Die Werte müssen EXAKT den Select-Optionen der Notion-Spalten
 * „Status WP-System" bzw. „Status PV-Anlage" entsprechen — neue Optionen
 * sollen dort nicht entstehen. Deshalb gibt es auch für „nicht gewählt" und
 * „Zeitpunkt unbekannt" einen echten Wert statt einer leeren Zelle: Notion
 * lehnt ein Select mit leerem Namen ab und der n8n-Lauf bricht ab.
 */
const UNCLEAR = { waermepumpe: 'noch unklar', pv: 'nicht vorhanden / noch unklar' };

function statusAnswer(site, key) {
  const unclear = UNCLEAR[key] || '';
  if (!has(site, key)) return unclear;
  if (status(site, key) === 'vorhanden') return 'Installiert & in Betrieb';
  if (status(site, key) !== 'geplant') return unclear;
  if (site.planningHorizon === 'In den nächsten 6 Monaten') return 'Inbetriebnahme in den nächsten 6 Monaten geplant';
  if (site.planningHorizon === 'In mehr als 6 Monaten') return 'Inbetriebnahme in mehr als 6 Monaten geplant';
  // „geplant, Zeitpunkt weiß nicht" – für diesen Fall gibt es in Notion keine
  // eigene Option; der Zeithorizont steht zusätzlich in den Extra-Spalten.
  return unclear;
}

const CASCADE = 'Eine / Mehrere Wärmepumpen gesteuert über einen zentralen Controller (Kaskade)';
const OWN_CONTROLLERS = 'Mehrere Wärmepumpen mit je eigenem Controller';

/**
 * WP-Konfiguration. Mehrere erfasste Wärmepumpen mit unterschiedlichen Reglern
 * sind per Definition „je eigener Controller" – das gilt auch dann, wenn die
 * Topologie je Eintrag nicht ausgefüllt wurde.
 */
const NO_HEAT_PUMP = 'Keine Wärmepumpe vorhanden';

function configAnswer(site) {
  if (!has(site, 'waermepumpe')) return NO_HEAT_PUMP;
  const pumps = siteHeatPumps(site);
  const controllers = new Set(pumps.map((hp) => (hp.controller || '').trim().toLowerCase()).filter(Boolean));
  if (pumps.length > 1 && controllers.size > 1) return OWN_CONTROLLERS;
  const topologies = pumps.map((hp) => hp.topology).filter(Boolean);
  if (topologies.includes('Mehrere parallel über verschiedene Regler')) return OWN_CONTROLLERS;
  if (topologies.some((t) => t === 'Eine Wärmepumpe' || t === 'Kaskade über einen Regler')) return CASCADE;
  if (pumps.length > 1) return OWN_CONTROLLERS;
  // Genau eine Wärmepumpe, Topologie nicht angegeben: der Kaskaden-Wortlaut
  // („Eine / Mehrere Wärmepumpen … über einen zentralen Controller") trifft für
  // eine einzelne Wärmepumpe zu. So bleibt das Feld nie leer – ein leeres
  // Select lehnt Notion ab.
  return CASCADE;
}

const ONLY_HEAT_PUMPS = 'Nur Wärmepumpen und ggf. Heizstäbe';
const WP_PLUS_DISTRICT = 'Wärmepumpen als Haupterzeuger und Fernwärme als Spitzenlast';
const WP_PLUS_GAS = 'Wärmepumpen als Haupterzeuger und Gas-Kessel als Spitzenlast';
const OTHER_IS_MAIN = 'Anderer Haupterzeuger und Wärmepumpe nur Spitzenlast/Warmwasser';

/**
 * Notion führt „Andere Wärmeerzeuger" als MULTI-SELECT mit fachlichen
 * Optionen (wer ist Haupterzeuger, was ist Spitzenlast) — nicht als Freitext.
 * Genau das erfragt das Formular über „WP Haupterzeuger" + die Liste der
 * weiteren Erzeuger, also leiten wir die passende Option daraus ab.
 *
 * Reihenfolge bei mehreren Erzeugern: Fernwärme vor Gas. Trifft keine Option
 * zu (z. B. WP + Öl-Kessel), bleibt das Feld leer — die konkreten Erzeuger
 * stehen ohnehin in der Extra-Spalte „Weitere Wärmeerzeuger (Details)".
 */
function otherGeneratorsAnswer(site) {
  const others = site.otherHeatSources || [];
  if (!has(site, 'waermepumpe')) return '';
  if (!others.length) return ONLY_HEAT_PUMPS;
  if (site.wpIsMainHeater === false) return OTHER_IS_MAIN;
  if (others.includes('fernwaerme')) return WP_PLUS_DISTRICT;
  if (others.includes('gas')) return WP_PLUS_GAS;
  return '';
}

/**
 * Wortlaut der Auswahl „Sonstige Wärmeerzeuger" aus dem alten Formular.
 * Nur für die Komponentenliste unten (reine Sheet-Spalte) — NICHT für die
 * Notion-Spalte „Andere Wärmeerzeuger", die fachliche Optionen erwartet.
 */
const OTHER_GENERATORS_LABEL =
  'Sonstige Wärmeerzeuger (Fernwärme, Gas-Brennwertkessel, Gas-Etagenheizung, etc.)';

/** Komponentenliste in der Wortwahl des alten Formulars. */
const COMPONENT_ANSWER = {
  waermepumpe: 'Wärmepumpe',
  pv: 'Photovoltaik (PV) Anlage',
  heizstab: 'Heizstab',
  batterie: 'Batteriespeicher',
};

function componentListAnswer(site) {
  const list = (site.selectedComponents || []).map((k) => COMPONENT_ANSWER[k]).filter(Boolean);
  if ((site.otherHeatSources || []).length) list.push(OTHER_GENERATORS_LABEL);
  return list.join(', ');
}

/**
 * PV-Nutzung → Select-Option „Commercial Setup" in Notion.
 * Sieben der acht Formularoptionen heißen dort exakt gleich. Nur „Wir sind
 * offen für Beratung zu diesem Thema" existiert in Notion nicht und würde eine
 * neue Option anlegen — deshalb auf die vorhandene, inhaltlich passende
 * Option abgebildet.
 */
const PV_USAGE_TO_NOTION = {
  'Wir sind offen für Beratung zu diesem Thema': 'Ist noch nicht entschieden',
};

/** Ohne PV-Anlage bzw. ohne Angabe: vorhandene Notion-Option statt leer. */
const PV_USAGE_UNCLEAR = 'Unklar / Noch nicht entschieden';

function pvUsageAnswer(site) {
  if (!has(site, 'pv')) return PV_USAGE_UNCLEAR;
  const v = site.pvUsage || '';
  if (!v) return PV_USAGE_UNCLEAR;
  return PV_USAGE_TO_NOTION[v] || v;
}

/** GLT/EMS: „Nein" oder „Ja" (mit Modbus-Zusatz, falls bekannt). */
function emsAnswer(site) {
  if (site.existingEms === false) return 'Nein';
  if (site.existingEms !== true) return '';
  return site.existingEmsModbus ? `Ja (Modbus: ${site.existingEmsModbus})` : 'Ja';
}

/**
 * Freitext für die Einsparberechnung – im alten Formular stand hier alles in
 * einem Feld (Wärmebedarf, Wohneinheiten, Speicher, Strompreis).
 */
function savingsAnswer(site) {
  if (site.calcSavings === false) return 'Nein';
  if (site.calcSavings !== true) return '';
  const c = site.components || {};
  const parts = [
    filled(site.annualHeatDemandKwh) ? `ca. ${site.annualHeatDemandKwh} kWh/Jahr Wärmebedarf` : '',
    filled(site.residentialUnits) ? `${site.residentialUnits} WE` : '',
    filled(site.tenantPowerParticipants) ? `${site.tenantPowerParticipants} Mieterstromteilnehmer` : '',
    has(site, 'batterie') && filled(c.batteryKwh) ? `Batteriespeicher ${c.batteryKwh} kWh` : '',
    has(site, 'batterie') ? '' : 'kein Batteriespeicher vorhanden',
    filled(site.electricityPriceEurKwh) ? `Strompreis ${site.electricityPriceEurKwh} €/kWh` : 'Strompreis unklar',
  ].filter(Boolean);
  return parts.length ? `Ja – ${parts.join('; ')}` : 'Ja';
}

/** „Straße 1, 10115 Berlin" */
function addressLine(site) {
  const cityLine = [site.plz, site.city].filter(Boolean).join(' ');
  return [site.streetHeating, cityLine].filter(Boolean).join(', ');
}

const jaNein = (v) => (v === true ? 'Ja' : v === false ? 'Nein' : '');

/**
 * Eine Zeile (ein Objekt, Schlüssel = Spaltenname) für eine Anlage.
 *
 * `timestamp` wird von außen übergeben, damit CSV, E-Mail und n8n denselben
 * Zeitstempel tragen; `index` ist die laufende Nummer der Anlage innerhalb der
 * Einreichung, `submissionId` verbindet die Zeilen einer Einreichung.
 */
export function buildSektorRow(site, { contact = {}, gfContact = '', timestamp = '', index = 0, submissionId = '' } = {}) {
  const c = site.components || {};
  const pumps = siteHeatPumps(site);

  return {
    Zeitstempel: timestamp,
    'Ihr Ansprechpartner bei Green Fusion': gfContact,
    'Ihr Unternehmen': contact.company || '',
    'Adressen aller Gebäude mit gleichen Eigenschaften': addressLine(site),

    // Mehrere Wärmepumpen: Werte mit " | " in derselben Reihenfolge, damit das
    // i-te Teilstück in jeder Spalte zur i-ten Wärmepumpe gehört.
    // ", " statt " | ": diese beiden Spalten landen in Notion in einem
    // MULTI-SELECT, und n8n trennt Multi-Select-Werte an Kommas.
    'Hersteller der Wärmepumpe': has(site, 'waermepumpe')
      ? pumps.map((hp) => heatPumpName(hp) || '—').join(', ')
      : '',
    'Wärmepumpen Controller (Modell- oder Serienname, z.B. ISG-Web)': has(site, 'waermepumpe')
      ? joinHeatPumpField(site, 'controller', ', ')
      : '',
    'Wärmepumpen-Konfiguration': configAnswer(site),
    'Andere Wärmeerzeuger ': otherGeneratorsAnswer(site),
    'Status Wärmepumpen-System': statusAnswer(site, 'waermepumpe'),

    'PV-Wechselrichter Hersteller': has(site, 'pv') ? c.pvInverterManufacturer || '' : '',
    'PV-Wechselrichter Modell / Serie': has(site, 'pv') ? c.pvInverterModel || '' : '',
    'Status PV-Anlage': statusAnswer(site, 'pv'),
    'PV-Anlage Konfiguration ': has(site, 'pv') && filled(c.pvKwp) ? `${c.pvKwp} kWp` : '',
    'Nutzung von PV-Strom in ihrem Gebäude?': pvUsageAnswer(site),
    'Berechnung der Einsparpotenziale (optional)': savingsAnswer(site),
    'PV-Partner ': has(site, 'pv') ? formatPvOperator(site) : '',
    'Gibt es ein Gebäudeleittechnik (GLT)-System oder Energiemonitoring/managementsystem (EMS) in ihrem Gebäude?':
      emsAnswer(site),
    'Was für einen Stromzähler hängt vor der Wärmepumpe?': site.meterType || '',
    'Was für Stromzähler gibt es bei Ihnen für der Wärmepumpe?': site.meterSplit || '',

    // Alt-Spalten des Formulars: bleiben im Format erhalten, werden aber nicht
    // mehr gefüllt („… 2" war eine Dublette, „Bewertung" macht GF selbst).
    'Nutzung von PV-Strom in ihrem Gebäude? 2': '',
    'Status Wärmepumpen-System (alt)': componentListAnswer(site),
    'Spalte 19': '',
    '': '',
    Bewertung: '',

    // ---- Zusätzliche Angaben aus GF-Forms ----
    'Anlage Nr.': index + 1,
    Einreichung: submissionId,
    'Straße & Hausnr. Heizungsanlage': site.streetHeating || '',
    PLZ: site.plz || '',
    Stadt: site.city || '',
    'Versorgte Gebäude': site.suppliedBuildings || '',
    Wohneinheiten: site.residentialUnits || '',
    'Wärmepumpen (Typen)': has(site, 'waermepumpe') && pumps.length ? pumps.length : '',
    'Wärmepumpe (Modell/Typ)': has(site, 'waermepumpe') ? joinHeatPumpField(site, 'model') : '',
    'WP Anzahl': has(site, 'waermepumpe') ? joinHeatPumpField(site, 'count') : '',
    'WP kW (elektrisch)': has(site, 'waermepumpe') ? joinHeatPumpField(site, 'kw') : '',
    'WP Haupterzeuger': has(site, 'waermepumpe') ? jaNein(site.wpIsMainHeater) : '',
    'Weitere Wärmeerzeuger (Details)': formatOtherHeatSources(site),
    'Heizstab Anzahl': has(site, 'heizstab') ? c.heatingRodCount || '' : '',
    'Heizstab kW': has(site, 'heizstab') ? c.heatingRodKw || '' : '',
    'Pufferspeicher Anzahl': has(site, 'pufferspeicher') ? c.bufferCount || '' : '',
    'Pufferspeicher Liter': has(site, 'pufferspeicher') ? c.bufferLiters || '' : '',
    'Batterie-Wechselrichter (Hersteller/Modell)': has(site, 'batterie') ? c.batteryInverterModel || '' : '',
    'Batterie Anzahl': has(site, 'batterie') ? c.batteryCount || '' : '',
    'Batterie kWh': has(site, 'batterie') ? c.batteryKwh || '' : '',
    'EMS nutzt Modbus': site.existingEms === true ? site.existingEmsModbus || '' : '',
    'Zeithorizont (Planung)': site.planningHorizon || '',
    'Jährl. Wärmebedarf (kWh)': site.calcSavings === true ? site.annualHeatDemandKwh || '' : '',
    Mieterstromteilnehmer: site.calcSavings === true ? site.tenantPowerParticipants || '' : '',
    'Strompreis (€/kWh)': site.calcSavings === true ? site.electricityPriceEurKwh || '' : '',
    'Ansprechpartner (Kunde)': contact.contactName || '',
    'E-Mail (Kunde)': contact.contactEmail || '',
    'Telefon (Kunde)': contact.contactPhone || '',
    Kommentar: site.comment || '',
  };
}

/** Deutscher Zeitstempel in Europe/Berlin, z. B. „31.07.2026 10:37:05". */
export function formatStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Alle Zeilen einer Einreichung (eine je Anlage).
 *
 * Die Zeitstempel werden je Anlage um eine Sekunde versetzt: Zeilen einer
 * Einreichung sind damit eindeutig und Dublettenfilter im Sheet/Flow (die z. B.
 * auf Zeitstempel + Unternehmen matchen) fassen sie nicht mehr zusammen.
 */
export function buildSektorRows(data, { gfContact = '', now = new Date() } = {}) {
  const contact = data.contact || data;
  const sites = Array.isArray(data.sites) ? data.sites : [data];
  const submissionId = data.draftId || data.submissionId || formatStamp(now);
  return sites.map((site, index) =>
    buildSektorRow(site, {
      contact,
      gfContact,
      timestamp: formatStamp(new Date(now.getTime() + index * 1000)),
      index,
      submissionId,
    }),
  );
}
