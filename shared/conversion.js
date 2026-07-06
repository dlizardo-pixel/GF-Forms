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
  strom: { unit: 'kWh Strom', factor: 1.0, note: 'Stromverbrauch wird bereits in kWh angegeben – keine Umrechnung nötig.' },
  sonstiges: { unit: 'kWh', factor: 1.0, note: 'Bitte den Verbrauch direkt in kWh angeben.' },
};

/**
 * Ordnet EINEN Heizungstyp dem passenden Einheiten-Schlüssel zu.
 * @param {string} heatingType – z. B. "Gas zentral", "Fernwärme"
 */
export function unitKeyForHeatingType(heatingType) {
  switch (heatingType) {
    case 'Gas zentral':
    case 'Gaskombi':
    case 'BHKW':
    case 'Hybridanlage (Gas + WP)':
      return 'gas'; // Gas wird in m³ erfasst (auch bei BHKW/Hybrid die maßgebliche Größe)
    case 'Fernwärme':
      return 'fernwaerme';
    case 'Wärmepumpe':
      return 'waermepumpe';
    case 'Nachtspeicher / Elektro':
      return 'strom';
    case 'Holz-Pellets':
      return 'pellets';
    case 'Öl':
      return 'oel';
    default:
      return 'sonstiges';
  }
}

/**
 * Bestimmt die Verbrauchs-Einheit aus einer Liste von Heizungstypen (Mehrfach-
 * auswahl). Nimmt den ersten Typ mit eindeutiger Einheit (z. B. bei „Gas + WP"
 * zählt der Gasverbrauch in m³).
 * @param {string[]|string} heatingTypes
 */
export function unitKeyForHeatingTypes(heatingTypes) {
  const arr = Array.isArray(heatingTypes) ? heatingTypes : heatingTypes ? [heatingTypes] : [];
  for (const t of arr) {
    const k = unitKeyForHeatingType(t);
    if (k !== 'sonstiges') return k;
  }
  return arr.length ? unitKeyForHeatingType(arr[0]) : 'sonstiges';
}

/**
 * Rechnet einen Verbrauchswert in kWh um.
 * @param {number|string} value
 * @param {string[]|string} heatingTypes – Heizungstyp(en) zur Bestimmung der Einheit
 * @returns {number|null}
 */
export function consumptionToKwh(value, heatingTypes) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (str === '') return null; // auch reine Leerzeichen zählen als „keine Angabe"
  const num = Number(str);
  // 0 (oder negativ) ist kein sinnvoller Jahresverbrauch → wie „keine Angabe"
  // behandeln, damit in CSV/Zusammenfassung keine irreführende 0 auftaucht.
  if (Number.isNaN(num) || num <= 0) return null;
  const { factor } = ENERGY_UNITS[unitKeyForHeatingTypes(heatingTypes)];
  return Math.round(num * factor);
}

/**
 * Liefert eine menschenlesbare Beschreibung der Umrechnung – für die
 * sichtbare Kennzeichnung in der Oberfläche und in der E-Mail-Zusammenfassung.
 */
export function describeConversion(value, heatingTypes) {
  const kwh = consumptionToKwh(value, heatingTypes);
  if (kwh === null) return null; // keine (sinnvolle) Angabe → nichts anzeigen
  const key = unitKeyForHeatingTypes(heatingTypes);
  const meta = ENERGY_UNITS[key];
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
