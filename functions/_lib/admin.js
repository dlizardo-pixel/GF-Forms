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
