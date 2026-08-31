/**
 * Sanfte Plausibilitäts-Hinweise (Abschnitt 8): keine harten Fehler, sondern
 * freundliche Hinweise, falls ein Wert ungewöhnlich wirkt. Der Kunde kann
 * trotzdem absenden.
 */

import { consumptionToKwh } from '../../shared/conversion.js';

/**
 * Prüft den spezifischen Verbrauch (kWh je m² und Jahr).
 * Übliche Größenordnung im Wohnungsbestand: grob 70–250 kWh/m²·a.
 */
export function checkConsumptionPerArea(system) {
  const area = Number(system.heatedAreaM2);
  const kwh = consumptionToKwh(system.consumptionLastYear, system.heatingTypes);
  if (!area || !kwh) return null;

  const perM2 = kwh / area;
  if (perM2 < 20) {
    return 'Die Zahl wirkt etwas niedrig für die Fläche — passt das, oder ist da ein Dreher drin?';
  }
  if (perM2 > 350) {
    return 'Die Zahl wirkt etwas hoch für die Fläche — passt das, oder ist da ein Dreher drin?';
  }
  return null;
}

/** Sammelt alle Hinweise für eine Anlage. */
export function systemHints(system) {
  return [checkConsumptionPerArea(system)].filter(Boolean);
}
