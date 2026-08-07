/**
 * Wärmepumpen einer Sektorkopplungs-Anlage.
 *
 * Eine Anlage kann mehrere *verschiedene* Wärmepumpen haben (anderes Modell,
 * anderer Regler, andere Größe). Deshalb steht am Standort eine Liste:
 *
 *   site.heatPumps = [{ model, controller, count, kw, topology }, …]
 *
 * Gleiche Geräte werden über `count` zusammengefasst; ein zweiter Eintrag ist
 * für einen anderen Typ gedacht.
 *
 * Altes Datenmodell (Entwürfe im Browser, Prefill-Links und Einreichungen, die
 * vor dieser Änderung entstanden sind): genau eine Wärmepumpe in
 * `site.components.heatPumpModel/-Controller/-Count/-Kw/-Topology`.
 * `siteHeatPumps()` liefert für beide Formen dieselbe Liste — daher nutzen
 * Oberfläche, CSV, E-Mail-Zusammenfassung und n8n-Mapping diese Funktion
 * gemeinsam.
 */

export const HEAT_PUMP_FIELDS = ['manufacturer', 'model', 'controller', 'count', 'kw', 'topology'];

/**
 * Antwort für „Regler kenne ich nicht". Der Regler entscheidet über die
 * Anbindbarkeit und bleibt deshalb ein Pflichtfeld — aber niemand soll am
 * Formular scheitern, weil die Angabe gerade nicht vorliegt. Diese Antwort
 * zählt als ausgefüllt; Green Fusion klärt den Regler dann gemeinsam.
 */
export const CONTROLLER_UNKNOWN = 'weiß nicht';

/** Alte Einzelfelder in `site.components` (nur noch für Rückwärtskompatibilität). */
export const LEGACY_HEAT_PUMP_KEYS = [
  'heatPumpModel',
  'heatPumpController',
  'heatPumpCount',
  'heatPumpKw',
  'heatPumpTopology',
];

/**
 * Leerer Wärmepumpen-Eintrag.
 *
 * `manufacturer` und `model` sind getrennt (wie beim PV-Wechselrichter): In
 * Bestandslisten steht das Gerät meist als „Buderus" + „Logaplus WLW-MB AH 12"
 * oder „Viessmann" + „Vitocal 151-A13". Der `controller` ist etwas anderes —
 * der Regler entscheidet über die Anbindung (z. B. Logamatic, Vitotronic,
 * ISG-Web) und fehlt in solchen Listen oft.
 */
export function makeHeatPump() {
  return { manufacturer: '', model: '', controller: '', count: '', kw: '', topology: '' };
}

/** „Buderus Logaplus WLW-MB AH 12" – Hersteller und Modell als ein Name. */
export function heatPumpName(hp) {
  return [hp.manufacturer, hp.model].filter((v) => filled(v)).join(' ');
}

const filled = (v) => v !== undefined && v !== null && String(v).trim() !== '';

/** Eintrag ohne jede Angabe? (wird beim Auswerten übersprungen) */
export function heatPumpIsEmpty(hp) {
  return !hp || !HEAT_PUMP_FIELDS.some((k) => filled(hp[k]));
}

/** Die alten Einzelfelder als ein Wärmepumpen-Eintrag. */
function legacyHeatPump(site) {
  const c = (site && site.components) || {};
  return {
    // `heatPumpModel` war im alten Formular mit „Hersteller der Wärmepumpe"
    // beschriftet – der Wert gehört deshalb in `manufacturer`.
    manufacturer: c.heatPumpModel || '',
    model: '',
    controller: c.heatPumpController || '',
    count: c.heatPumpCount || '',
    kw: c.heatPumpKw || '',
    topology: c.heatPumpTopology || '',
  };
}

/**
 * Alle Wärmepumpen einer Anlage mit mindestens einer Angabe — neue Liste
 * bevorzugt, sonst die alten Einzelfelder. Kann leer sein (Komponente gewählt,
 * aber noch nichts eingetragen).
 */
export function siteHeatPumps(site) {
  const list = Array.isArray(site && site.heatPumps)
    ? site.heatPumps.map((hp) => ({ ...makeHeatPump(), ...hp })).filter((hp) => !heatPumpIsEmpty(hp))
    : [];
  if (list.length) return list;
  const legacy = legacyHeatPump(site);
  return heatPumpIsEmpty(legacy) ? [] : [legacy];
}

/**
 * Für die Eingabemaske: immer mindestens ein (ggf. leerer) Eintrag. Anders als
 * `siteHeatPumps()` bleiben leere Einträge erhalten — genau die füllt der Kunde
 * gerade aus, nachdem er „Weitere Wärmepumpe hinzufügen" geklickt hat.
 */
export function editableHeatPumps(site) {
  const raw = Array.isArray(site && site.heatPumps)
    ? site.heatPumps.map((hp) => ({ ...makeHeatPump(), ...hp }))
    : [];
  if (raw.some((hp) => !heatPumpIsEmpty(hp))) return raw;
  const legacy = siteHeatPumps(site); // noch nichts Neues eingetragen → alte Einzelfelder
  if (legacy.length) return legacy;
  return raw.length ? raw : [makeHeatPump()];
}

/**
 * Anlagen, bei denen der Regler noch fehlt — dieselbe Regel wie in der
 * serverseitigen Prüfung, damit die Oberfläche vorher darauf hinweisen kann
 * (statt den Kunden erst beim Absenden auflaufen zu lassen).
 */
export function missingControllerCount(site) {
  const selected = Array.isArray(site && site.selectedComponents) && site.selectedComponents.includes('waermepumpe');
  if (!selected) return 0;
  const pumps = siteHeatPumps(site);
  if (!pumps.length) return 1;
  return pumps.filter((hp) => !filled(hp.controller)).length;
}

/** Summe der Geräte über alle Einträge (leeres `count` zählt als 1). */
export function heatPumpUnitCount(site) {
  return siteHeatPumps(site).reduce((sum, hp) => sum + (Number(hp.count) || 1), 0);
}

/**
 * Ein Eintrag als lesbarer Text:
 * "Stiebel Eltron · 3× · 12 kW · Regler: ISG-Web · Kaskade über einen Regler"
 */
export function formatHeatPump(hp) {
  return [
    heatPumpName(hp),
    filled(hp.count) ? `${hp.count}×` : '',
    filled(hp.kw) ? `${hp.kw} kW` : '',
    filled(hp.controller) ? `Regler: ${hp.controller}` : '',
    hp.topology,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Ein Feld über alle Wärmepumpen für eine einspaltige Ausgabe (CSV, n8n).
 * Getrennt mit " | ", damit das i-te Teilstück in jeder Spalte zur i-ten
 * Wärmepumpe gehört ("Stiebel Eltron | Vaillant" ↔ "ISG-Web | sensoNET").
 *
 * `separator`: Für die beiden Spalten, die in Notion auf ein MULTI-SELECT
 * gehen (Hersteller, Controller-Serie), muss mit ", " getrennt werden – n8n
 * zerlegt Multi-Select-Werte an Kommas. Mit " | " entstünde dort eine einzige
 * unsinnige Option ("Vaillant | Stiebel Eltron").
 */
export function joinHeatPumpField(site, key, separator = ' | ') {
  const list = siteHeatPumps(site);
  if (!list.some((hp) => filled(hp[key]))) return ''; // nirgends gefüllt → leere Zelle
  if (list.length === 1) return String(list[0][key] ?? '');
  // Bei mehreren Wärmepumpen hält "—" die Position, damit die Spalten zueinander passen.
  return list.map((hp) => (filled(hp[key]) ? String(hp[key]) : '—')).join(separator);
}
