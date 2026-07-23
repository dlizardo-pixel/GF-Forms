/**
 * Auswahl-Optionen für die Formulare (zentral, damit Oberfläche und CSV
 * dieselben Werte verwenden).
 *
 * Hinweis: Die Begriffe sind bewusst in Kundensprache gehalten
 * (z. B. „Gas zentral", „Gaskombi") statt technischer Bezeichnungen.
 */

// Label der „Sonstiges"-Option, die ein Freitextfeld öffnet.
export const HEATING_OTHER = 'Was anderes / weiß nicht';

export const HEATING_TYPES = [
  'Gas zentral',
  'Gaskombi',
  'Hybridanlage (Gas + WP)',
  'Wärmepumpe',
  'Fernwärme',
  'BHKW',
  'Öl',
  'Holz-Pellets',
  'Nachtspeicher / Elektro',
  HEATING_OTHER,
];

// Vorgabe Energieträger auf Projektebene (Einfachauswahl; „Sonstiges" ergibt als
// Vorgabe keinen Sinn und bleibt daher außen vor).
export const ENERGY_TYPE_OPTIONS = ['(keine Vorgabe)', ...HEATING_TYPES.filter((t) => t !== HEATING_OTHER)];

export const BILLING_CYCLES = ['(keine Angabe)', 'monatlich', 'quartalsweise', 'halbjährlich', 'jährlich'];

// Sektorkopplung – wählbare Komponenten (Reihenfolge in Kundensprache).
export const SK_COMPONENTS = [
  { key: 'waermepumpe', label: 'Wärmepumpe' },
  { key: 'pv', label: 'Solaranlage (PV)' },
  { key: 'batterie', label: 'Batteriespeicher' },
  { key: 'pufferspeicher', label: 'Pufferspeicher' },
  { key: 'heizstab', label: 'Heizstab' },
];

export const INSTALLATION_STATUS = ['läuft schon', 'in Planung', 'weiß nicht'];

// --- Sektorkopplung: fachliche Detail-Auswahlen (grün/gelb/rot-relevant) ---

// WP-Topologie (eine WP vs. Kaskade vs. mehrere parallele Regler).
export const WP_TOPOLOGY = [
  'Eine Wärmepumpe',
  'Kaskade über einen Regler',
  'Mehrere parallel über verschiedene Regler',
  'weiß nicht',
];

// PV-Strom: wie wird der erzeugte Solarstrom im Gebäude genutzt?
// (Volleinspeisung = kein Strom für die Wärmepumpe verfügbar.)
export const PV_USAGE = [
  'Volleinspeisung',
  'Allgemeinstrom',
  'Allgemeinstrom + Wärmepumpe',
  'Mieterstrom (durch Sie)',
  'Mieterstrom (durch Anbieter)',
  'Gemeinschaftliche Gebäudeversorgung',
  'Ist noch nicht entschieden',
  'Wir sind offen für Beratung zu diesem Thema',
];

// Wer betreibt die PV-Anlage?
export const PV_OPERATOR = ['Wir selbst', 'Ein Dritter (z. B. Einhundert, metergrid …)', 'weiß nicht'];

// Haben wir Zugriff / die Erlaubnis auf die Anlage?
export const SITE_ACCESS = ['Ja, Zugriff/Erlaubnis vorhanden', 'Teilweise', 'Nein / noch nicht geklärt'];

// Zeithorizont bei „in Planung".
export const PLANNING_HORIZON = ['In den nächsten 6 Monaten', 'In mehr als 6 Monaten', 'weiß nicht'];

// Weitere Wärmeerzeuger neben der Wärmepumpe.
export const OTHER_HEAT_SOURCES = [
  { key: 'gas', label: 'Gas-Kessel' },
  { key: 'fernwaerme', label: 'Fernwärme' },
  { key: 'bhkw', label: 'BHKW' },
  { key: 'oel', label: 'Öl-Kessel' },
  { key: 'sonstige', label: 'Sonstige' },
];
