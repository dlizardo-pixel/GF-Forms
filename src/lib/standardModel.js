/** Datenmodell-Helfer für das Standard-Formular. */

/** Leere Anlage – mit Vorbelegung aus Projekt-Vorgaben und (optional) Vorgänger. */
export function makeSystem(project = {}, prev = null) {
  const base = {
    streetHeating: '',
    plz: '',
    city: '',
    lat: null,
    lng: null,
    heatingTypes: [], // Mehrfachauswahl
    heatingTypeOther: '', // Freitext bei „Was anderes / weiß nicht"
    // Mehrere Gebäude / Unterstationen (eine kombinierte Frage – geht in die Preisstufe ein)
    multiSupply: undefined,
    supplyCount: '',
    districtHeatingConnectionKw: '',
    residentialUnits: '',
    heatedAreaM2: '',
    specialNotes: '',
    consumptionLastYear: '',
    consumptionPrevYear: '',
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
  };

  // Projekt-Vorgabe Energieträger als Standard übernehmen (pro Anlage änderbar).
  if (project.defaultEnergyType && project.defaultEnergyType !== '(keine Vorgabe)') {
    base.heatingTypes = [project.defaultEnergyType];
  }

  // "Werte von letzter Anlage übernehmen": Vorgänger als Ausgangswert kopieren,
  // aber adress-spezifische Felder leeren.
  if (prev) {
    return {
      ...prev,
      streetHeating: '',
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
    Array.isArray(s.heatingTypes) &&
    s.heatingTypes.length > 0 &&
    !!String(s.heatedAreaM2).trim() &&
    !!String(s.consumptionLastYear).trim()
  );
}
