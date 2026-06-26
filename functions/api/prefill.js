/**
 * GET /api/prefill?id=… – öffentlicher Endpunkt: liefert die vorausgefüllten
 * Daten zu einer Kurz-ID. Bewusst OHNE Admin-Schutz, da der Kunde den Link
 * anklickt; die zufällige, nicht erratbare ID dient als Zugangsschlüssel.
 */
import { getPrefill } from '../_lib/store.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ ok: false, error: 'Nicht verfügbar.' }, 503);
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ ok: false, error: 'id fehlt.' }, 400);

  try {
    const payload = await getPrefill(env.DB, id);
    if (!payload) return json({ ok: false, error: 'Dieser Link ist abgelaufen oder ungültig.' }, 404);
    return json({ ok: true, payload });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
