/**
 * PLZ → Stadt (und Koordinaten) automatisch ermitteln.
 *
 * Wir nutzen den kostenlosen, schlüssellosen Dienst Zippopotam.us
 * (https://api.zippopotam.us/de/<PLZ>). Er liefert für eine deutsche
 * Postleitzahl den Ortsnamen sowie Längen-/Breitengrad. Die Koordinaten
 * merken wir gleich mit – sie werden später für eine Kartenansicht gebraucht
 * (Abschnitt 8 der Aufgabe).
 *
 * Fällt der Dienst aus, ist das unkritisch: Die Stadt kann jederzeit von Hand
 * eingetragen/überschrieben werden.
 */

const cache = new Map();

export async function lookupPlz(plz) {
  const clean = String(plz || '').trim();
  if (!/^\d{5}$/.test(clean)) return null; // deutsche PLZ = 5 Ziffern

  if (cache.has(clean)) return cache.get(clean);

  try {
    const res = await fetch(`https://api.zippopotam.us/de/${clean}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places && data.places[0];
    if (!place) return null;
    const result = {
      city: place['place name'],
      lat: place.latitude ? Number(place.latitude) : null,
      lng: place.longitude ? Number(place.longitude) : null,
    };
    cache.set(clean, result);
    return result;
  } catch {
    return null; // Netzwerkfehler → still ignorieren, Stadt manuell möglich
  }
}
