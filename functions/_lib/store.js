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

// Vorausgefüllte Links dürfen etwas länger leben (Kunde klickt evtl. erst Wochen später).
export const PREFILL_RETENTION_DAYS = 90;

const nowIso = () => new Date().toISOString();
const cutoffIso = (days = RETENTION_DAYS) => new Date(Date.now() - days * 86400000).toISOString();

// Sorgt dafür, dass Bestands-Datenbanken die Spalte `deleted_at` (Papierkorb)
// bekommen, ohne dass jemand von Hand ein Migrations-Skript ausführen muss.
// SQLite kennt kein „ADD COLUMN IF NOT EXISTS", daher fangen wir den Fehler ab.
// Wird pro Worker-Instanz nur einmal versucht.
let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  try {
    await db.prepare('ALTER TABLE entries ADD COLUMN deleted_at TEXT').run();
  } catch {
    /* Spalte existiert bereits – ignorieren */
  }
  schemaReady = true;
}

/** Kurze, URL-taugliche Zufalls-ID (~12 Zeichen). */
function shortId() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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
  // Sektorkopplung: Ansprechpartner in data.contact, mehrere Anlagen in data.sites
  // (rückwärtskompatibel zum alten Einzel-Anlagen-Format).
  const contact = (data && data.contact) || data || {};
  const sites = Array.isArray(data && data.sites) ? data.sites : [data];
  return {
    company: contact.company || '',
    name: contact.contactName || '',
    email: contact.contactEmail || '',
    count: sites.length,
  };
}

/** Abgelaufene Einträge entfernen (Aufbewahrungsfrist). */
export async function purgeExpired(db) {
  await db.prepare('DELETE FROM entries WHERE updated_at < ?').bind(cutoffIso()).run();
}

/** In den Papierkorb legen (deleted=true) oder wiederherstellen (deleted=false). */
export async function setEntryDeleted(db, id, deleted) {
  await ensureSchema(db);
  await db
    .prepare('UPDATE entries SET deleted_at = ? WHERE id = ?')
    .bind(deleted ? nowIso() : null, id)
    .run();
}

/** Endgültig löschen (Papierkorb leeren). */
export async function hardDeleteEntry(db, id) {
  await db.prepare('DELETE FROM entries WHERE id = ?').bind(id).run();
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

/**
 * Übersichtsliste (ohne den großen Daten-Blob).
 * `trashed=false` → normale Einträge, `trashed=true` → Papierkorb.
 */
export async function listEntries(db, { trashed = false } = {}) {
  await ensureSchema(db);
  const where = trashed ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL';
  const order = trashed ? 'deleted_at' : 'updated_at';
  const res = await db
    .prepare(
      `SELECT id, type, status, company, contact_name, contact_email, system_count, created_at, updated_at, submitted_at, deleted_at
       FROM entries WHERE ${where} ORDER BY ${order} DESC LIMIT 500`,
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

// ---- Vorausgefüllte Links ---------------------------------------------------

/** Abgelaufene Prefill-Links entfernen. */
export async function purgeExpiredPrefills(db) {
  await db.prepare('DELETE FROM prefills WHERE created_at < ?').bind(cutoffIso(PREFILL_RETENTION_DAYS)).run();
}

/** Prefill-Daten speichern, kurze ID zurückgeben. */
export async function createPrefill(db, payload) {
  const id = shortId();
  await db
    .prepare('INSERT INTO prefills (id, data, created_at) VALUES (?, ?, ?)')
    .bind(id, JSON.stringify(payload ?? {}), nowIso())
    .run();
  return id;
}

/** Prefill-Daten anhand der ID holen (oder null). */
export async function getPrefill(db, id) {
  const row = await db.prepare('SELECT data FROM prefills WHERE id = ?').bind(id).first();
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}
