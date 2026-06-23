/** Datenmodell-Helfer für das Sektorkopplungs-Formular (mehrere Anlagen). */

/** Leere Anlage. Optional Werte einer Vorgänger-Anlage übernehmen (ohne Adresse). */
export function makeSite(prev = null) {
  const base = {
    streetHeating: '',
    suppliedBuildings: '',
    plz: '',
    city: '',
    lat: null,
    lng: null,
    residentialUnits: '',

    selectedComponents: [],
    componentStatus: {}, // pro Komponente: 'vorhanden' | 'geplant'
    planningHorizon: '', // nur relevant, wenn etwas geplant ist

    components: {
      heatPumpModel: '',
      heatPumpCount: '',
      heatPumpKw: '',
      heatPumpController: '', // Regler/Controller (entscheidet Anbindbarkeit, nicht der Installateur)
      heatPumpTopology: '',
      pvInverterModel: '',
      pvCount: '',
      pvKwp: '',
      batteryInverterModel: '',
      batteryCount: '',
      batteryKwh: '',
      bufferCount: '',
      bufferLiters: '',
      heatingRodCount: '',
      heatingRodKw: '',
    },

    wpIsMainHeater: undefined, // ist die WP der Haupt-Wärmeerzeuger?
    otherHeatSources: [], // weitere Wärmeerzeuger (Gas/Fernwärme/BHKW …)

    existingEms: undefined, // anderes EMS/GLT vorhanden?
    existingEmsModbus: '', // nutzt es Modbus?

    pvUsage: '', // Eigenverbrauch / Volleinspeisung / weiß nicht
    pvOperator: '', // selbst / Dritter / weiß nicht
    pvOperatorName: '', // falls Dritter
    siteAccess: '', // Zugriff/Erlaubnis auf die Anlage?

    installer: '', // optionale Nebeninfo (falls Gerätezugang über den Installateur nötig)
    comment: '',
  };

  if (prev) {
    // Werte übernehmen, aber adress-spezifische Felder leeren.
    return {
      ...JSON.parse(JSON.stringify(prev)),
      streetHeating: '',
      suppliedBuildings: '',
      plz: '',
      city: '',
      lat: null,
      lng: null,
    };
  }
  return base;
}

/** Pflichtfelder einer Anlage erfüllt? (Adresse) */
export function isSiteComplete(s) {
  return !!s.streetHeating?.trim() && !!s.plz?.trim() && !!s.city?.trim();
}

/** Ist in dieser Anlage mindestens eine Komponente als „geplant" markiert? */
export function siteHasPlanned(s) {
  return Object.values(s.componentStatus || {}).includes('geplant');
}
