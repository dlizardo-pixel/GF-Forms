/**
 * Energieträger-abhängige Umrechnung der Jahresverbräuche in kWh.
 *
 * Hintergrund (Abschnitt 8 der Aufgabe): Der Kunde gibt den Verbrauch in der
 * für seinen Energieträger üblichen Einheit ein. Intern – und in der CSV –
 * rechnen wir IMMER in kWh um, damit die Werte vergleichbar sind.
 *
 * Die verwendeten Faktoren sind dokumentierte, praxisübliche Näherungswerte.
 * Sie können hier zentral angepasst werden, falls Green Fusion genauere
 * Brennwerte verwenden möchte.
 */

// Faktor: 1 Einheit der Kunden-Eingabe entspricht X kWh.
export const ENERGY_UNITS = {
  gas: { unit: 'm³ Gas', factor: 10.0, note: '1 m³ Erdgas ≈ 10 kWh (Näherung; tatsächlich je nach Brennwert/Zustandszahl ca. 9,8–11,5 kWh)' },
  fernwaerme: { unit: 'kWh Wärme', factor: 1.0, note: 'Fernwärme wird bereits in kWh angegeben – keine Umrechnung nötig.' },
  waermepumpe: { unit: 'kWh Strom', factor: 1.0, note: 'Elektrische Energie wird bereits in kWh angegeben – keine Umrechnung nötig.' },
  pellets: { unit: 'kg', factor: 4.8, note: '1 kg Holzpellets ≈ 4,8 kWh (Näherung; ca. 4,6–5,0 kWh)' },
  oel: { unit: 'Liter', factor: 10.0, note: '1 Liter Heizöl ≈ 10 kWh (Näherung; ca. 9,8–10,6 kWh)' },
  sonstiges: { unit: 'kWh', factor: 1.0, note: 'Bitte den Verbrauch direkt in kWh angeben.' },
};

/**
 * Ordnet einen Heizungstyp dem passenden Einheiten-Schlüssel zu.
 * @param {string} heatingType – Wert aus dem Formular (z. B. "Gas", "Fernwärme")
 * @returns {string} Schlüssel aus ENERGY_UNITS
 */
export function unitKeyForHeatingType(heatingType) {
  switch (heatingType) {
    case 'Gas zentral':
    case 'Gaskombi':
      return 'gas'; // Gas wird in m³ erfasst
    case 'Fernwärme':
      return 'fernwaerme';
    case 'Wärmepumpe':
      return 'waermepumpe';
    case 'Holz-Pellets':
      return 'pellets';
    case 'Öl':
      return 'oel';
    default:
      return 'sonstiges';
  }
}

/**
 * Rechnet einen Verbrauchswert in kWh um.
 * @param {number|string} value – eingegebener Wert in Kunden-Einheit
 * @param {string} heatingType – Heizungstyp zur Bestimmung der Einheit
 * @returns {number|null} Verbrauch in kWh (gerundet) oder null, wenn kein Wert
 */
export function consumptionToKwh(value, heatingType) {
  if (value === '' || value === null || value === undefined) return null;
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  const { factor } = ENERGY_UNITS[unitKeyForHeatingType(heatingType)];
  return Math.round(num * factor);
}

/**
 * Liefert eine menschenlesbare Beschreibung der Umrechnung – für die
 * sichtbare Kennzeichnung in der Oberfläche und in der E-Mail-Zusammenfassung.
 */
export function describeConversion(value, heatingType) {
  if (value === '' || value === null || value === undefined) return null;
  const key = unitKeyForHeatingType(heatingType);
  const meta = ENERGY_UNITS[key];
  const kwh = consumptionToKwh(value, heatingType);
  if (meta.factor === 1.0) {
    return `${formatNumber(value)} ${meta.unit}`;
  }
  return `${formatNumber(value)} ${meta.unit} ≈ ${formatNumber(kwh)} kWh (Faktor ${String(meta.factor).replace('.', ',')})`;
}

function formatNumber(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString('de-DE');
}
