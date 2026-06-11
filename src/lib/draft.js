/**
 * Zwischenspeichern im Browser (localStorage), damit Kundinnen und Kunden das
 * Ausfüllen unterbrechen und später weitermachen können – ohne Datenbank.
 *
 * Es werden nur die Formulareingaben gespeichert (kein Versand, keine
 * Übertragung). Nach erfolgreichem Absenden wird der Entwurf gelöscht.
 */

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* z. B. privater Modus / Speicher voll – Zwischenspeichern ist optional */
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignorieren */
  }
}
