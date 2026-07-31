/** Datenmodell-Helfer für das Sektorkopplungs-Formular (mehrere Anlagen). */

import {
  makeHeatPump,
  editableHeatPumps,
  LEGACY_HEAT_PUMP_KEYS,
} from '../../shared/heatPumps.js';

export { makeHeatPump };

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

    // Wärmepumpen: eine Liste, damit mehrere verschiedene Geräte (anderes
    // Modell, anderer Regler) je Anlage erfasst werden können. Gleiche Geräte
    // werden im Eintrag über `count` zusammengefasst. Siehe shared/heatPumps.js.
    heatPumps: [makeHeatPump()],

    components: {
      pvInverterManufacturer: '', // PV-Wechselrichter Hersteller (für Anbindbarkeits-Abgleich)
      pvInverterModel: '', // PV-Wechselrichter Modell / Serie
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

    // Stromzähler rund um die Wärmepumpe (siehe METER_TYPES / METER_SPLITS).
    // Entscheidet mit, ob der Wärmepumpen-Strom getrennt messbar ist.
    meterType: '',
    meterSplit: '',

    pvUsage: '', // Nutzung des PV-Stroms im Gebäude (siehe PV_USAGE)
    pvOperator: '', // selbst / Dritter / weiß nicht
    pvOperatorName: '', // falls Dritter

    // Optionale Angaben für die Einsparpotenzial-Berechnung. Wohneinheiten und
    // Batteriespeicher werden aus den bereits erfassten Feldern (residentialUnits,
    // batteryCount/batteryKwh) übernommen – hier nur die zusätzlichen Werte.
    calcSavings: undefined, // Einsparpotenziale berechnen? (Ja/Nein)
    annualHeatDemandKwh: '', // jährlicher Wärmebedarf des Gebäudes in kWh
    tenantPowerParticipants: '', // Anzahl Mieterstromteilnehmer
    electricityPriceEurKwh: '', // Strompreis in €/kWh

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

/**
 * Bringt Rohdaten (Browser-Entwurf, Prefill-Link, API-Payload) auf das aktuelle
 * Modell: fehlende Felder ergänzen und eine einzelne Wärmepumpe aus den alten
 * Einzelfeldern (`components.heatPump*`) in die Liste `heatPumps` übernehmen.
 */
export function normalizeSite(raw) {
  const empty = makeSite();
  const site = { ...empty, ...(raw || {}) };
  site.components = { ...empty.components, ...((raw && raw.components) || {}) };
  // Bewusst aus `raw`: sonst würde die leere Vorgabe aus makeSite() eine alte
  // Wärmepumpe aus `components.heatPump*` verdecken.
  site.heatPumps = editableHeatPumps(raw || {});
  // Alte Einzelfelder entfernen – ab jetzt gilt ausschließlich `heatPumps`.
  LEGACY_HEAT_PUMP_KEYS.forEach((k) => delete site.components[k]);
  return site;
}

/** Pflichtfelder einer Anlage erfüllt? (Adresse) */
export function isSiteComplete(s) {
  return !!s.streetHeating?.trim() && !!s.plz?.trim() && !!s.city?.trim();
}

/** Ist in dieser Anlage mindestens eine Komponente als „geplant" markiert? */
export function siteHasPlanned(s) {
  return Object.values(s.componentStatus || {}).includes('geplant');
}
