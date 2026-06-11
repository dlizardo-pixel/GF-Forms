/**
 * Vorbelegen von Feldern über Aufruf-Parameter (URL-Query).
 *
 * Vorbereitung für Stufe 2 (Abschnitt 10): Später soll ein personalisierter
 * Link je Kunde – z. B. aus HubSpot – die Projekt-Felder automatisch füllen.
 * Schon jetzt liest die Anwendung passende Query-Parameter aus, damit sich
 * diese Funktion ohne Umbau ergänzen lässt.
 *
 * Beispiel:
 *   /standard?company=Musterbau%20eG&contactName=Erika%20Muster&email=erika@musterbau.de&systemCount=3
 */

export function readPrefill(search) {
  const p = new URLSearchParams(search || '');
  const get = (...keys) => {
    for (const k of keys) {
      const v = p.get(k);
      if (v) return v;
    }
    return '';
  };
  return {
    contactName: get('contactName', 'name'),
    contactRole: get('role'),
    company: get('company', 'firma'),
    contactEmail: get('email', 'mail'),
    systemCount: get('systemCount', 'anlagen'),
    defaultEnergyType: get('energyType'),
    billingCycle: get('billingCycle'),
    // Sektorkopplung
    streetHeating: get('street', 'strasse'),
    plz: get('plz'),
    city: get('city', 'stadt'),
  };
}
