/**
 * Green Fusion Brand Assets (Design System v2).
 *
 * Logos und Icons liegen als statische Dateien in dieser App unter
 * `public/brand/` und werden von Cloudflare Pages direkt (gleiche Domain)
 * ausgeliefert – KEIN externer Abruf mehr von raw.githubusercontent.com.
 * (Das Brand-Repo dlizardo-pixel/Ressources-Greenfusion ist privat, dessen
 * raw-URLs lieferten im Browser 404 → Icons blieben leer.)
 *
 * Neue Assets: SVG in `public/brand/` legen und hier referenzieren.
 *
 * Auswahlregel Logo:
 *  - heller Hintergrund (#FFF, #F5FAF7, #FBFBFB) → Green
 *  - dunkler Hintergrund (#062726, #216377 …)    → White
 */

const BASE = '/brand/';

export const LOGOS = {
  horizontalGreen: BASE + 'logo-horizontal-green.svg',
  horizontalWhite: BASE + 'logo-horizontal-white.svg',
  horizontalBlack: BASE + 'logo-horizontal-black.svg',
};

/** Icons (Outline-Stil), lokal in public/brand/. */
export const ICONS = {
  gas: BASE + 'icon-gas.svg',
  heating: BASE + 'icon-heating.svg',
  heatpumpLg: BASE + 'icon-heatpump-lg.svg',
  heatpumpSm: BASE + 'icon-heatpump-sm.svg',
  heatrod: BASE + 'icon-heatrod.svg',
  power: BASE + 'icon-power.svg',
  pv: BASE + 'icon-pv.svg',
  meter: BASE + 'icon-meter.svg',
  people: BASE + 'icon-people.svg',
  techGuy: BASE + 'icon-techguy.svg',
  tools: BASE + 'icon-tools.svg',
};

/** Heizungstyp → passendes Icon (nur dort, wo eine sinnvolle Entsprechung existiert). */
export const HEATING_TYPE_ICON = {
  'Gas zentral': ICONS.gas,
  Gaskombi: ICONS.gas,
  'Hybridanlage (Gas + WP)': ICONS.heatpumpSm,
  Wärmepumpe: ICONS.heatpumpSm,
  Fernwärme: ICONS.heating,
  BHKW: ICONS.power,
  Öl: ICONS.heating,
  'Holz-Pellets': ICONS.heating,
  'Nachtspeicher / Elektro': ICONS.power,
  'Was anderes / weiß nicht': ICONS.tools,
};

/** Sektorkopplungs-Komponente → Icon. */
export const COMPONENT_ICON = {
  waermepumpe: ICONS.heatpumpSm,
  heizstab: ICONS.heatrod,
  pufferspeicher: ICONS.heating,
  pv: ICONS.pv,
  batterie: ICONS.power,
};
