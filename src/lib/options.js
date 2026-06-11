/**
 * Auswahl-Optionen für die Formulare (zentral, damit Oberfläche und CSV
 * dieselben Werte verwenden).
 */

export const HEATING_TYPES = [
  'Gas',
  'Fernwärme',
  'Blockheizkraftwerk',
  'Wärmepumpe',
  'Ölheizung',
  'Holz-Pellets',
  'Sonstiges',
];

// Vorgabe Energieträger auf Projektebene (entspricht den Heizungstypen).
export const ENERGY_TYPE_OPTIONS = ['(keine Vorgabe)', ...HEATING_TYPES];

export const BILLING_CYCLES = ['(keine Angabe)', 'monatlich', 'quartalsweise', 'halbjährlich', 'jährlich'];

// Sektorkopplung – wählbare Komponenten.
export const SK_COMPONENTS = [
  { key: 'waermepumpe', label: 'Wärmepumpe' },
  { key: 'heizstab', label: 'Heizstab' },
  { key: 'pufferspeicher', label: 'Pufferspeicher' },
  { key: 'pv', label: 'PV-Anlage' },
  { key: 'batterie', label: 'Batteriespeicher' },
];

export const INSTALLATION_STATUS = ['in Betrieb', 'in Planung', 'unbekannt'];
