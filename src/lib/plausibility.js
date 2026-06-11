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
  const kwh = consumptionToKwh(system.consumptionLastYear, system.heatingType);
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

/** Baujahr außerhalb plausibler Grenzen? */
export function checkConstructionYear(year) {
  const y = Number(year);
  if (!y) return null;
  const now = new Date().getFullYear();
  if (y < 1850 || y > now) {
    return `${y} als Baujahr/Sanierung — ist da vielleicht ein Tippfehler drin?`;
  }
  return null;
}

/** Sammelt alle Hinweise für eine Anlage. */
export function systemHints(system) {
  return [checkConsumptionPerArea(system), checkConstructionYear(system.constructionYear)].filter(Boolean);
}
