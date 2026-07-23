/**
 * Kleine, frontend-seitige Konfiguration.
 *
 * GF_CONTACT_EMAIL ist die Adresse für den „Notausgang" (Liste per Mail
 * schicken). Sie ist clientseitig sichtbar (öffnet das Mailprogramm des
 * Kunden) und daher KEIN Secret. Per Build-Variable VITE_GF_CONTACT_EMAIL
 * überschreibbar; sonst gilt der Standard.
 */
export const GF_CONTACT_EMAIL = import.meta.env.VITE_GF_CONTACT_EMAIL || 'd.lizardo@green-fusion.de';

// Ab wie vielen Anlagen wird die Tabelle statt des geführten Flusses genutzt?
export const GUIDED_MAX = 3;

// Sektorkopplung: bis zu dieser Anzahl gehen wir Anlagen einzeln durch,
// ab (SEKTOR_GUIDED_MAX + 1) zeigen wir die Tabellenansicht. 1 Anlage = ein
// einzelnes Formular, 2 = nacheinander, ab 3 = Tabelle.
export const SEKTOR_GUIDED_MAX = 2;

// Ab wie vielen Anlagen blenden wir den „Notausgang" (Liste per Mail) ein?
// 0 = immer (für alle), unabhängig von der Anzahl.
export const PORTFOLIO_HINT_FROM = 0;
