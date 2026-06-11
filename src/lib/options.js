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
