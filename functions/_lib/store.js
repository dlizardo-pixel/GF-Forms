/**
 * Datenzugriff auf die D1-Datenbank (Cloudflare).
 *
 * Speichert Entwürfe und eingereichte Erfassungen in der Tabelle `entries`.
 * Dateien/Ordner mit führendem „_" werden von Cloudflare Pages NICHT als Route
 * behandelt – diese Datei ist also nur ein Hilfsmodul, kein Endpunkt.
 *
 * Datenschutz: `purgeExpired` löscht alte Einträge nach Ablauf der
 * Aufbewahrungsfrist. Da Cloudflare Pages keine geplanten Jobs (Cron) bietet,
 * räumen wir „beiläufig" bei jeder Schreib-/Listen-Operation auf.
 */

export const RETENTION_DAYS = 30;

const nowIso = () => new Date().toISOString();
const cutoffIso = () => new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();

/** Kurz-Infos für die Übersichtsliste aus den Eingaben ziehen. */
function summarize(type, data) {
  if (type === 'standard') {
    const p = (data && data.project) || {};
    return {
      company: p.company || '',
      name: p.contactName || '',
      email: p.contactEmail || '',
      count: Array.isArray(data && data.systems) ? data.systems.length : null,
    };
  }
  return {
    company: (data && data.company) || '',
    name: (data && data.contactName) || '',
    email: (data && data.contactEmail) || '',
    count: 1,
  };
}

/** Abgelaufene Einträge entfernen (Aufbewahrungsfrist). */
export async function purgeExpired(db) {
  await db.prepare('DELETE FROM entries WHERE updated_at < ?').bind(cutoffIso()).run();
}

/**
 * Entwurf anlegen/aktualisieren. Liefert die (ggf. neu erzeugte) ID zurück,
 * damit der Client denselben Datensatz weiter aktualisiert.
 * Bereits eingereichte Datensätze werden nicht zu „draft" zurückgesetzt.
 */
export async function upsertDraft(db, { id, type, data }) {
  const now = nowIso();
  const s = summarize(type, data);
  const json = JSON.stringify(data ?? {});
  const useId = id || crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO entries (id, type, status, company, contact_name, contact_email, system_count, data, created_at, updated_at)
       VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         type=excluded.type,
         company=excluded.company,
         contact_name=excluded.contact_name,
         contact_email=excluded.contact_email,
         system_count=excluded.system_count,
         data=excluded.data,
         updated_at=excluded.updated_at
       WHERE entries.status='draft'`,
    )
    .bind(useId, type, s.company, s.name, s.email, s.count, json, now, now)
    .run();

  return useId;
}

/** Einreichung speichern (status='submitted'). Aktualisiert einen Entwurf, falls vorhanden. */
export async function markSubmitted(db, { id, type, data }) {
  const now = nowIso();
  const s = summarize(type, data);
  const json = JSON.stringify(data ?? {});
  const useId = id || crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO entries (id, type, status, company, contact_name, contact_email, system_count, data, created_at, updated_at, submitted_at)
       VALUES (?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status='submitted',
         type=excluded.type,
         company=excluded.company,
         contact_name=excluded.contact_name,
         contact_email=excluded.contact_email,
         system_count=excluded.system_count,
         data=excluded.data,
         updated_at=excluded.updated_at,
         submitted_at=excluded.submitted_at`,
    )
    .bind(useId, type, s.company, s.name, s.email, s.count, json, now, now, now)
    .run();

  return useId;
}

/** Übersichtsliste (ohne den großen Daten-Blob). */
export async function listEntries(db) {
  const res = await db
    .prepare(
      `SELECT id, type, status, company, contact_name, contact_email, system_count, created_at, updated_at, submitted_at
       FROM entries ORDER BY updated_at DESC LIMIT 500`,
    )
    .all();
  return res.results || [];
}

/** Einzelnen Eintrag inkl. Eingaben holen. */
export async function getEntry(db, id) {
  const row = await db.prepare('SELECT * FROM entries WHERE id = ?').bind(id).first();
  if (!row) return null;
  let data = {};
  try {
    data = JSON.parse(row.data);
  } catch {
    /* ignore */
  }
  return { ...row, data };
}
