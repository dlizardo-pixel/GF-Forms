/**
 * Auswahl-Optionen für die Formulare (zentral, damit Oberfläche und CSV
 * dieselben Werte verwenden).
 *
 * Hinweis: Die Begriffe sind bewusst in Kundensprache gehalten
 * (z. B. „Gas zentral", „Gaskombi") statt technischer Bezeichnungen.
 */

export const HEATING_TYPES = [
  'Gas zentral',
  'Gaskombi',
  'Fernwärme',
  'Wärmepumpe',
  'Öl',
  'Holz-Pellets',
  'Was anderes / weiß nicht',
];

// Vorgabe Energieträger auf Projektebene (entspricht den Heizungstypen).
export const ENERGY_TYPE_OPTIONS = ['(keine Vorgabe)', ...HEATING_TYPES];

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

// PV-Strom: Eigenverbrauch vs. Volleinspeisung (Volleinspeisung = kein Strom für WP).
export const PV_USAGE = ['Eigenverbrauch', 'Volleinspeisung', 'weiß nicht'];

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
