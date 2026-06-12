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

  const summarize = (type, data) => {
    if (type === 'standard') {
      const p = (data && data.project) || {};
      return { company: p.company || '', name: p.contactName || '', email: p.contactEmail || '', count: (data.systems || []).length };
    }
    return { company: data.company || '', name: data.contactName || '', email: data.contactEmail || '', count: 1 };
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
      server.middlewares.use('/api/admin', (req, res) => {
        if (!req.headers['x-admin-key']) return sendJson(res, 401, { ok: false, error: 'Nicht autorisiert.' });
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname.startsWith('/entries')) {
          const list = [...entries.values()].map(({ data, ...rest }) => rest).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
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
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiPlugin()],
});
