/**
 * POST /api/admin/trash – Papierkorb-Aktionen für einen Eintrag.
 * Body: { id, action } mit action ∈ 'delete' | 'restore' | 'purge'.
 *   delete  → in den Papierkorb legen (soft delete)
 *   restore → aus dem Papierkorb zurückholen
 *   purge   → endgültig löschen
 * Geschützt über ADMIN_PASSWORD (Header x-admin-key).
 */
import { setEntryDeleted, hardDeleteEntry } from '../../_lib/store.js';
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
  const { id, action } = body || {};
  if (!id || !action) return json({ ok: false, error: 'id/action fehlt.' }, 400);

  try {
    if (action === 'delete') await setEntryDeleted(env.DB, id, true);
    else if (action === 'restore') await setEntryDeleted(env.DB, id, false);
    else if (action === 'purge') await hardDeleteEntry(env.DB, id);
    else return json({ ok: false, error: 'Unbekannte Aktion.' }, 400);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
}
