/**
 * Hilfsfunktionen für die geschützten Admin-Endpunkte.
 *
 * Schutz über das Secret ADMIN_PASSWORD (Cloudflare-Umgebungsvariable). Der
 * Client schickt es im Header `x-admin-key`. Einfacher Schutz für ein internes
 * Werkzeug – die Seite ist nur über HTTPS erreichbar.
 */

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Prüft den Admin-Zugriff. Gibt eine Fehler-Response zurück, wenn nicht
 * berechtigt – sonst null (= ok).
 */
export function adminGuard(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ ok: false, error: 'Admin-Bereich ist nicht konfiguriert (ADMIN_PASSWORD fehlt).' }, 503);
  }
  const key = request.headers.get('x-admin-key');
  if (key !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: 'Nicht autorisiert.' }, 401);
  }
  return null;
}

/**
 * Prüft den Zugriff auf die Integrations-API (externe Tools) über
 * `Authorization: Bearer <PREFILL_API_TOKEN>`. Eigenes Secret, damit das
 * Admin-Passwort nicht in fremde Tools kopiert werden muss.
 * Gibt eine Fehler-Response zurück, wenn nicht berechtigt – sonst null (= ok).
 */
export function bearerGuard(request, env) {
  if (!env.PREFILL_API_TOKEN) {
    return json({ ok: false, error: 'API ist nicht konfiguriert (PREFILL_API_TOKEN fehlt).' }, 503);
  }
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token !== env.PREFILL_API_TOKEN) {
    return json({ ok: false, error: 'Nicht autorisiert.' }, 401);
  }
  return null;
}
