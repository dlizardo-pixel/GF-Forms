import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildSubmission } from './shared/submission.js';
import { buildStandardCsv, buildSektorkopplungCsv } from './shared/csv.js';

/**
 * Dev-Plugin: Damit sich die komplette Anwendung – inkl. „Absenden",
 * Cloud-Zwischenspeichern und Admin-Übersicht – schon mit `npm run dev` (reiner
 * Vite-Server) mit Testwerten ausprobieren lässt, fängt dieses Plugin die
 * /api/*-Aufrufe ab und nutzt einen einfachen In-Memory-Speicher.
 *
 * Es wird KEINE echte E-Mail verschickt und KEINE Datenbank genutzt. In der
 * echten Cloudflare-Umgebung greifen stattdessen die Funktionen unter
 * functions/api/* mit D1 + Brevo. Der lokale Admin akzeptiert jedes Passwort.
 */
function devApiPlugin() {
  const entries = new Map(); // id → Eintrag (nur im Speicher, pro Dev-Sitzung)
  const prefills = new Map(); // id → Prefill-Payload (Dev)

  const summarize = (type, data) => {
    if (type === 'standard') {
      const p = (data && data.project) || {};
      return { company: p.company || '', contact_name: p.contactName || '', contact_email: p.contactEmail || '', system_count: (data.systems || []).length };
    }
    const contact = data.contact || data || {};
    const sites = Array.isArray(data.sites) ? data.sites : [data];
    return { company: contact.company || '', contact_name: contact.contactName || '', contact_email: contact.contactEmail || '', system_count: sites.length };
  };

  const readBody = (req) =>
    new Promise((resolve) => {
      let b = '';
      req.on('data', (c) => (b += c));
      req.on('end', () => {
        try {
          resolve(JSON.parse(b || '{}'));
        } catch {
          resolve({});
        }
      });
    });

  const sendJson = (res, status, obj) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };

  return {
    name: 'gf-dev-api',
    configureServer(server) {
      // Absenden (validiert + erzeugt CSV, kein echter Versand) + als 'submitted' ablegen.
      server.middlewares.use('/api/submit', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false });
        const data = await readBody(req);
        const result = buildSubmission(data);
        if (!result.valid) return sendJson(res, 422, { ok: false, errors: result.errors });
        const id = data.draftId || 'dev-' + Math.random().toString(36).slice(2, 10);
        const s = summarize(data.type, data);
        const now = new Date().toISOString();
        const prev = entries.get(id);
        entries.set(id, { id, type: data.type, status: 'submitted', ...s, data, created_at: prev?.created_at || now, updated_at: now, submitted_at: now });
        // eslint-disable-next-line no-console
        console.log('[DEV] Absenden gespeichert (submitted):', id, '–', result.csvFilename);
        sendJson(res, 200, { ok: true, mock: true });
      });

      // Cloud-Zwischenspeichern.
      server.middlewares.use('/api/draft', async (req, res) => {
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false });
        const { id, type, data } = await readBody(req);
        const useId = id || 'dev-' + Math.random().toString(36).slice(2, 10);
        const s = summarize(type, data);
        const now = new Date().toISOString();
        const prev = entries.get(useId);
        if (!prev || prev.status === 'draft') {
          entries.set(useId, { id: useId, type, status: 'draft', ...s, data, created_at: prev?.created_at || now, updated_at: now, submitted_at: null });
        }
        sendJson(res, 200, { ok: true, id: useId, stored: true });
      });

      // Admin (jedes nicht-leere Passwort wird im Dev akzeptiert).
      server.middlewares.use('/api/admin', async (req, res) => {
        if (!req.headers['x-admin-key']) return sendJson(res, 401, { ok: false, error: 'Nicht autorisiert.' });
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith('/prefill') && req.method === 'POST') {
          const { payload } = await readBody(req);
          const id = 'dev-' + Math.random().toString(36).slice(2, 12);
          prefills.set(id, payload || {});
          return sendJson(res, 200, { ok: true, id });
        }
        if (url.pathname.startsWith('/trash') && req.method === 'POST') {
          const { id, action } = await readBody(req);
          const entry = entries.get(id);
          if (!entry) return sendJson(res, 404, { ok: false, error: 'Nicht gefunden.' });
          if (action === 'delete') entry.deleted_at = new Date().toISOString();
          else if (action === 'restore') entry.deleted_at = null;
          else if (action === 'purge') entries.delete(id);
          else return sendJson(res, 400, { ok: false, error: 'Unbekannte Aktion.' });
          return sendJson(res, 200, { ok: true });
        }
        if (url.pathname.startsWith('/entries')) {
          const trashed = url.searchParams.get('trashed') === '1';
          const list = [...entries.values()]
            .filter((e) => (trashed ? !!e.deleted_at : !e.deleted_at))
            .map(({ data, ...rest }) => rest)
            .sort((a, b) => (trashed ? (b.deleted_at || '').localeCompare(a.deleted_at || '') : b.updated_at.localeCompare(a.updated_at)));
          return sendJson(res, 200, { ok: true, entries: list });
        }
        if (url.pathname.startsWith('/entry')) {
          const entry = entries.get(url.searchParams.get('id'));
          if (!entry) return sendJson(res, 404, { ok: false, error: 'Nicht gefunden.' });
          if (url.searchParams.get('format') === 'csv') {
            const csv = entry.type === 'standard' ? buildStandardCsv(entry.data) : buildSektorkopplungCsv(entry.data);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="GF-${entry.id}.csv"`);
            return res.end(csv);
          }
          return sendJson(res, 200, { ok: true, entry });
        }
        sendJson(res, 404, { ok: false });
      });

      // Integrations-API (externe Tools): im Dev wird jeder nicht-leere
      // Bearer-Token akzeptiert; live prüft functions/api/v1/prefill-link.js
      // gegen das Secret PREFILL_API_TOKEN.
      server.middlewares.use('/api/v1/prefill-link', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
          return res.end();
        }
        if (req.method !== 'POST') return sendJson(res, 405, { ok: false });
        const auth = req.headers['authorization'] || '';
        if (!auth.startsWith('Bearer ') || !auth.slice(7).trim()) {
          return sendJson(res, 401, { ok: false, error: 'Nicht autorisiert.' });
        }
        const body = await readBody(req);
        const { type, payload } = body || {};
        if (type !== 'standard' && type !== 'sektorkopplung') {
          return sendJson(res, 400, { ok: false, error: "type muss 'standard' oder 'sektorkopplung' sein." });
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          return sendJson(res, 400, { ok: false, error: 'payload fehlt oder ist kein Objekt.' });
        }
        if (type === 'standard' && (typeof payload.project !== 'object' || !Array.isArray(payload.systems))) {
          return sendJson(res, 400, { ok: false, error: "Für type 'standard' braucht payload die Felder 'project' (Objekt) und 'systems' (Liste)." });
        }
        if (type === 'sektorkopplung' && (typeof payload.contact !== 'object' || !Array.isArray(payload.sites))) {
          return sendJson(res, 400, { ok: false, error: "Für type 'sektorkopplung' braucht payload die Felder 'contact' (Objekt) und 'sites' (Liste)." });
        }
        const id = 'dev-' + Math.random().toString(36).slice(2, 12);
        prefills.set(id, payload);
        const origin = `http://${req.headers.host || 'localhost:5173'}`;
        sendJson(res, 200, { ok: true, id, url: `${origin}/${type === 'standard' ? 'standard' : 'sektorkopplung'}?p=${id}` });
      });

      // Öffentlicher Prefill-Abruf (für den Kundenlink).
      server.middlewares.use('/api/prefill', (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        const payload = prefills.get(url.searchParams.get('id'));
        if (!payload) return sendJson(res, 404, { ok: false, error: 'Dieser Link ist abgelaufen oder ungültig.' });
        sendJson(res, 200, { ok: true, payload });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
});
