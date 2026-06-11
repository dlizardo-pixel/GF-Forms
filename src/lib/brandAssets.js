/**
 * Green Fusion Brand Assets (Design System v2).
 *
 * Logos und Icons werden direkt als URLs aus dem offiziellen Brand-Repository
 * eingebunden (kein Base64, kein Nachzeichnen). Quelle:
 * https://github.com/dlizardo-pixel/Ressources-Greenfusion
 *
 * Auswahlregel Logo:
 *  - heller Hintergrund (#FFF, #F5FAF7, #FBFBFB) → Green
 *  - dunkler Hintergrund (#062726, #216377 …)    → White
 */

const BASE = 'https://raw.githubusercontent.com/dlizardo-pixel/Ressources-Greenfusion/main/';

export const LOGOS = {
  horizontalGreen: BASE + 'GreenFusion-Logo-horizontal-green-RGB.svg',
  horizontalWhite: BASE + 'GreenFusion-Logo-horizontal-white-RGB.svg',
  horizontalBlack: BASE + 'GreenFusion-Logo-horizontal-black-RGB.svg',
};

/**
 * Icons (Outline-Stil). Die Dateinamen im Repo enthalten teils Leerzeichen
 * (auch doppelte) – diese sind hier korrekt als %20 kodiert.
 */
export const ICONS = {
  gas: BASE + 'icon%20gas-1.svg',
  heating: BASE + 'icon%20heating%20heizungskoerper.svg',
  heatpumpLg: BASE + 'icon%20heatpump-lg.svg',
  heatpumpSm: BASE + 'icon%20heatpump-sm.svg',
  heatrod: BASE + 'icon%20%20heatrod.svg',
  power: BASE + 'icon%20steckdose%20power.svg',
  pv: BASE + 'icon%20pv%20anlage.svg',
  meter: BASE + 'icon%20zahler%20meter-1.svg',
  people: BASE + 'icon%20%20people.svg',
  techGuy: BASE + 'icon%20%20tech-guy.svg',
  tools: BASE + 'tools.svg',
};

/** Heizungstyp → passendes Icon (nur dort, wo eine sinnvolle Entsprechung existiert). */
export const HEATING_TYPE_ICON = {
  Gas: ICONS.gas,
  Fernwärme: ICONS.heating,
  Blockheizkraftwerk: ICONS.power,
  Wärmepumpe: ICONS.heatpumpSm,
  Ölheizung: ICONS.heating,
  'Holz-Pellets': ICONS.heating,
  Sonstiges: ICONS.tools,
};

/** Sektorkopplungs-Komponente → Icon. */
export const COMPONENT_ICON = {
  waermepumpe: ICONS.heatpumpSm,
  heizstab: ICONS.heatrod,
  pufferspeicher: ICONS.heating,
  pv: ICONS.pv,
  batterie: ICONS.power,
};
