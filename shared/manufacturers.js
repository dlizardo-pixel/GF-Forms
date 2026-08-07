/**
 * Vorschlagslisten für Hersteller (Vorschlagsliste / Autocomplete).
 * Der Kunde kann tippen und Vorschläge wählen ODER frei etwas Eigenes
 * eingeben – die Liste ist nur eine Hilfe, keine Einschränkung.
 *
 * SCHREIBWEISE IST WICHTIG: Der n8n-Flow sucht die Anbindbarkeits-Ampel über
 * `Manufacturer equals <Hersteller>` in den Notion-Datenbanken „Controller DB"
 * bzw. „Inverter DB". Dieser Vergleich ist GROSS-/KLEINSCHREIBUNGSSENSITIV —
 * „NIBE" fand deshalb den Eintrag „Nibe" nicht und die Ampel blieb leer.
 * Die Namen hier deshalb genau so schreiben wie in den beiden Notion-DBs.
 */

// Schreibweise = Spalte „Manufacturer" der Notion-„Controller DB".
export const HEAT_PUMP_MANUFACTURERS = [
  'Stiebel Eltron',
  'Viessmann',
  'Vaillant',
  'Bosch',
  'Buderus',
  'Wolf',
  'Daikin',
  'Nibe',
  'Panasonic',
  'Weishaupt',
  'Dimplex',
  'Alpha Innotec',
  'Remko',
  'Remeha',
  'Ochsner',
  'iDM',
  'Waterkotte',
  'Hoval',
  'Brötje',
  'Junkers',
  'Elco',
  'Siemens',
  'Danfoss',
  'Lambda',
  'CTA',
  'CTC',
  'KWB',
  'Technische Alternative',
  'Kieback&Peter',
  'Priva',
];

// Schreibweise = Spalte „Manufacturer" der Notion-„Inverter DB".
export const PV_INVERTER_MANUFACTURERS = [
  'SMA',
  'Fronius',
  'Kostal',
  'SolarEdge',
  'Huawei',
  'GoodWe',
  'Sungrow',
  'Fenecon',
  'FoxESS',
  'AlphaESS',
  'Ginlong (Solis)',
  'Growatt',
  'Deye',
  'E3DC',
  'Varta',
  'Enphase',
  'ABB',
];

export const BATTERY_INVERTER_MANUFACTURERS = [
  'AlphaESS',
  'BYD',
  'SMA',
  'Fronius',
  'sonnen',
  'Huawei',
  'Tesla',
  'Varta',
  'E3/DC',
];
