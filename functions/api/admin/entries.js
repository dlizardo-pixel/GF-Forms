/**
 * GET /api/admin/entries  – Übersichtsliste aller Entwürfe + Einreichungen.
 * Geschützt über ADMIN_PASSWORD (Header x-admin-key).
 */
import { listEntries, purgeExpired } from '../../_lib/store.js';
import { json, adminGuard } from '../../_lib/admin.js';

export async function onRequestGet({ request, env }) {
  const denied = adminGuard(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ ok: true, entries: [] });

  try {
    await purgeExpired(env.DB);
    const entries = await listEntries(env.DB);
    return json({ ok: true, entries });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
