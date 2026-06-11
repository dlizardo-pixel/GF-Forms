/** Datenmodell-Helfer für das Standard-Formular. */

/** Leere Anlage – mit Vorbelegung aus Projekt-Vorgaben und (optional) Vorgänger. */
export function makeSystem(project = {}, prev = null) {
  const base = {
    streetHeating: '',
    suppliedBuildings: '',
    plz: '',
    city: '',
    lat: null,
    lng: null,
    heatingType: '',
    substationPresent: undefined,
    substationCount: '',
    powerKw: '',
    modelInfo: '',
    districtHeatingConnectionKw: '',
    centralHotWater: undefined,
    residentialUnits: '',
    constructionYear: '',
    heatedAreaM2: '',
    specialNotes: '',
    consumptionLastYear: '',
    consumptionPrevYear: '',
    consumptionPrevPrevYear: '',
    // Vertrag & Abrechnung (optional, einklappbar)
    caretakerContact: '',
    caretakerPhone: '',
    heatingCircuits: '',
    internetModem: undefined,
    internetPassword: '',
    billingAddress: '',
    billingEmail: '',
    additionalRecipients: '',
    referenceNumber: '',
    billingCycle: '',
  };

  // Projekt-Vorgaben als Standard übernehmen (pro Anlage änderbar).
  if (project.defaultEnergyType && project.defaultEnergyType !== '(keine Vorgabe)') {
    base.heatingType = project.defaultEnergyType;
  }
  if (project.billingCycle && project.billingCycle !== '(keine Angabe)') {
    base.billingCycle = project.billingCycle;
  }

  // "Werte von letzter Anlage übernehmen": Vorgänger als Ausgangswert kopieren,
  // aber adress-spezifische Felder leeren (die unterscheiden sich immer).
  if (prev) {
    return {
      ...prev,
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

/** Pflichtfelder einer einzelnen Anlage erfüllt? */
export function isSystemComplete(s) {
  return (
    !!s.streetHeating?.trim() &&
    !!s.plz?.trim() &&
    !!s.city?.trim() &&
    !!s.heatingType?.trim() &&
    !!String(s.heatedAreaM2).trim() &&
    !!String(s.consumptionLastYear).trim()
  );
}
