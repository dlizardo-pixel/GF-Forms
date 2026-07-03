/**
 * POST /api/v1/prefill-link – Integrations-API für externe Tools.
 *
 * Nimmt vorbereitete Formulardaten entgegen, legt sie als Prefill in D1 ab
 * und gibt einen fertigen Kundenlink zurück (gleiche Mechanik wie die
 * vorausgefüllten Links aus dem Admin-Bereich).
 *
 * Auth:   Authorization: Bearer <PREFILL_API_TOKEN>   (Cloudflare-Secret)
 * Body:   { type: 'standard' | 'sektorkopplung', payload: {…} }
 *         standard        → payload = { project: {…}, systems: [{…}] }
 *         sektorkopplung  → payload = { contact: {…}, sites: [{…}] }
 * Antwort: { ok: true, id, url }
 *
 * Vollständige Feldreferenz und Beispiele: docs/API.md
 */
import { createPrefill, purgeExpiredPrefills } from '../../_lib/store.js';
import { json, bearerGuard } from '../../_lib/admin.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const cors = (res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
};

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const denied = bearerGuard(request, env);
  if (denied) return cors(denied);
  if (!env.DB) return cors(json({ ok: false, error: 'Keine Datenbank gebunden (D1).' }, 503));

  let body;
  try {
    body = await request.json();
  } catch {
    return cors(json({ ok: false, error: 'Ungültiges JSON im Request-Body.' }, 400));
  }

  const type = body && body.type;
  const payload = body && body.payload;
  if (type !== 'standard' && type !== 'sektorkopplung') {
    return cors(json({ ok: false, error: "type muss 'standard' oder 'sektorkopplung' sein." }, 400));
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return cors(json({ ok: false, error: 'payload fehlt oder ist kein Objekt.' }, 400));
  }
  if (type === 'standard') {
    if (typeof payload.project !== 'object' || !Array.isArray(payload.systems)) {
      return cors(
        json({ ok: false, error: "Für type 'standard' braucht payload die Felder 'project' (Objekt) und 'systems' (Liste)." }, 400),
      );
    }
  } else if (typeof payload.contact !== 'object' || !Array.isArray(payload.sites)) {
    return cors(
      json({ ok: false, error: "Für type 'sektorkopplung' braucht payload die Felder 'contact' (Objekt) und 'sites' (Liste)." }, 400),
    );
  }

  try {
    await purgeExpiredPrefills(env.DB);
    const id = await createPrefill(env.DB, payload);
    const url = `${new URL(request.url).origin}/${type === 'standard' ? 'standard' : 'sektorkopplung'}?p=${id}`;
    return cors(json({ ok: true, id, url }));
  } catch (err) {
    return cors(json({ ok: false, error: err.message }, 500));
  }
}
