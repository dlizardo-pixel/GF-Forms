/**
 * Lesbare Beschriftungen für Sektorkopplungs-Werte – gemeinsam von CSV-Erzeugung
 * und E-Mail-Zusammenfassung genutzt (damit beide dieselben Begriffe verwenden).
 */

export const COMPONENT_LABELS = {
  waermepumpe: 'Wärmepumpe',
  pv: 'PV',
  batterie: 'Batterie',
  pufferspeicher: 'Pufferspeicher',
  heizstab: 'Heizstab',
};

export const STATUS_LABELS = { vorhanden: 'läuft schon', geplant: 'ist geplant' };

export const OTHER_HEAT_SOURCE_LABELS = {
  gas: 'Gas-Kessel',
  fernwaerme: 'Fernwärme',
  bhkw: 'BHKW',
  oel: 'Öl-Kessel',
  sonstige: 'Sonstige',
};

const jaNein = (v) => (v === true ? 'Ja' : v === false ? 'Nein' : '');

/** "Wärmepumpe: läuft schon · PV: ist geplant" */
export function formatComponentStatus(site) {
  const sel = site.selectedComponents || [];
  return sel
    .map((k) => `${COMPONENT_LABELS[k] || k}: ${STATUS_LABELS[(site.componentStatus || {})[k]] || 'ausgewählt'}`)
    .join(' · ');
}

/** "Gas-Kessel, Fernwärme" */
export function formatOtherHeatSources(site) {
  return (site.otherHeatSources || []).map((k) => OTHER_HEAT_SOURCE_LABELS[k] || k).join(', ');
}

/** PV-Betreiber inkl. Name des Dritten, falls vorhanden. */
export function formatPvOperator(site) {
  if (!site.pvOperator) return '';
  if (site.pvOperator.startsWith('Ein Dritter') && site.pvOperatorName) {
    return `${site.pvOperator} – ${site.pvOperatorName}`;
  }
  return site.pvOperator;
}

export { jaNein };
