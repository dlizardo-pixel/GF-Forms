/**
 * GET /api/admin/entry?id=…            – einzelner Eintrag inkl. Eingaben (JSON)
 * GET /api/admin/entry?id=…&format=csv – derselbe Eintrag als CSV-Download
 * Geschützt über ADMIN_PASSWORD (Header x-admin-key).
 */
import { getEntry } from '../../_lib/store.js';
import { json, adminGuard } from '../../_lib/admin.js';
import { buildStandardCsv, buildSektorkopplungCsv } from '../../../shared/csv.js';

export async function onRequestGet({ request, env }) {
  const denied = adminGuard(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: 'Keine Datenbank gebunden.' }, 503);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return json({ ok: false, error: 'id fehlt.' }, 400);

  let entry;
  try {
    entry = await getEntry(env.DB, id);
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
  if (!entry) return json({ ok: false, error: 'Nicht gefunden.' }, 404);

  if (url.searchParams.get('format') === 'csv') {
    const csv = entry.type === 'standard' ? buildStandardCsv(entry.data) : buildSektorkopplungCsv(entry.data);
    const filename = `GF-${entry.type}-${id.slice(0, 8)}.csv`;
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  return json({ ok: true, entry });
}
