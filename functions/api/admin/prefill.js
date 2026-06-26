/**
 * POST /api/admin/prefill – legt einen vorausgefüllten Datensatz ab und gibt
 * eine kurze ID zurück, aus der ein kurzer Kundenlink gebaut wird.
 * Geschützt über ADMIN_PASSWORD (Header x-admin-key).
 */
import { createPrefill, purgeExpiredPrefills } from '../../_lib/store.js';
import { json, adminGuard } from '../../_lib/admin.js';

export async function onRequestPost({ request, env }) {
  const denied = adminGuard(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'Keine Datenbank gebunden (D1).' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Ungültiges JSON.' }, 400);
  }
  if (!body || typeof body.payload !== 'object') {
    return json({ ok: false, error: 'payload fehlt.' }, 400);
  }

  try {
    await purgeExpiredPrefills(env.DB);
    const id = await createPrefill(env.DB, body.payload);
    return json({ ok: true, id });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
