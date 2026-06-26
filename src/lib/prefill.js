/**
 * Vorbelegen von Feldern über Aufruf-Parameter (URL-Query).
 *
 * Zwei Varianten:
 *  1. Einfache URL-Parameter (`?company=…&email=…&systemCount=3`) — historisch,
 *     vorbereitet für HubSpot-Links.
 *  2. Encoded Prefill (`?prefill=<base64-json>`) — der ganze Datenstand
 *     (Ansprechpartner + alle Anlagen) wird in den Link verpackt. So kann
 *     Green Fusion einem Kunden einen Link schicken, in dem bereits alle
 *     bekannten Daten eingetragen sind; der Kunde ergänzt nur noch das
 *     Fehlende (z. B. den Heizungstyp).
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

// ---------------------------------------------------------------------------
// Encoded Prefill (?prefill=…)
// ---------------------------------------------------------------------------

/**
 * Base64-url-safe Kodierung, UTF-8-fest (Umlaute funktionieren).
 * `=`-Padding wird entfernt; `+`/`/` durch `-`/`_` ersetzt.
 */
function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Erzeugt einen Prefill-String, der hinten an die Form-URL gehängt wird.
 * Erwartet ein Objekt wie { project: {...}, systems: [...] }
 * (siehe Datenmodell StandardForm).
 */
export function encodePrefill(payload) {
  return b64urlEncode(JSON.stringify(payload));
}

/**
 * Liest `?prefill=…` aus der URL und gibt das dekodierte Objekt zurück.
 * Liefert null, wenn nicht vorhanden oder ungültig.
 */
export function readEncodedPrefill(search) {
  const p = new URLSearchParams(search || '');
  const raw = p.get('prefill');
  if (!raw) return null;
  try {
    return JSON.parse(b64urlDecode(raw));
  } catch {
    return null;
  }
}
