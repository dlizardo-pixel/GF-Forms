/**
 * Cloudflare Pages Function: automatisches Zwischenspeichern in der Cloud.
 *
 *   POST /api/draft   Body: { id?, type, data }
 *
 * Speichert den aktuellen (unfertigen) Stand in D1, damit Eingaben nicht
 * verloren gehen und Green Fusion sie bei Bedarf einsehen kann. Liefert die
 * Datensatz-ID zurück; der Client schickt sie bei der nächsten Speicherung
 * wieder mit, damit derselbe Eintrag aktualisiert statt dupliziert wird.
 *
 * Ohne gebundene D1-Datenbank (`env.DB`) verhält sich der Endpunkt neutral
 * (kein Fehler), damit lokale Tests ohne Datenbank funktionieren.
 */

import { upsertDraft, purgeExpired } from '../_lib/store.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: true, id: null, stored: false });

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, errors: ['Ungültiges JSON.'] }, 400);
  }

  const { id, type, data } = body || {};
  if (type !== 'standard' && type !== 'sektorkopplung') {
    return json({ ok: false, errors: ['Unbekannter Formulartyp.'] }, 400);
  }

  try {
    await purgeExpired(env.DB);
    const savedId = await upsertDraft(env.DB, { id, type, data });
    return json({ ok: true, id: savedId, stored: true });
  } catch (err) {
    // Zwischenspeichern ist „best effort" – Fehler nicht hart melden.
    // eslint-disable-next-line no-console
    console.error('Draft-Speicherung fehlgeschlagen:', err);
    return json({ ok: false, errors: ['Speichern fehlgeschlagen.'] }, 500);
  }
}
