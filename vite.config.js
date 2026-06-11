import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildSubmission } from './shared/submission.js';

/**
 * Kleines Dev-Plugin: Damit sich die komplette Anwendung – inklusive
 * "Absenden" und Dankeseite – schon mit `npm run dev` (reiner Vite-Server)
 * mit Testwerten ausprobieren lässt, fängt dieses Plugin POST /api/submit ab.
 *
 * Es wird KEINE echte E-Mail verschickt. Stattdessen werden die serverseitige
 * Validierung und die CSV-Erzeugung tatsächlich ausgeführt (dieselbe Logik wie
 * in der Cloudflare Pages Function) und das Ergebnis als JSON zurückgegeben.
 * So sieht man lokal sofort, ob die Daten vollständig sind und wie die CSV
 * aussieht – ohne Brevo-Schlüssel.
 *
 * In der echten Cloudflare-Umgebung wird dieses Plugin NICHT genutzt; dort
 * greift die Funktion unter functions/api/submit.js.
 */
function mockSubmitPlugin() {
  return {
    name: 'gf-mock-submit',
    configureServer(server) {
      server.middlewares.use('/api/submit', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const data = JSON.parse(body || '{}');
            const result = buildSubmission(data); // validiert + erzeugt CSV
            if (!result.valid) {
              res.statusCode = 422;
              res.end(JSON.stringify({ ok: false, errors: result.errors }));
              return;
            }
            // Lokaler Mock-Modus: nur Konsolenausgabe, kein echter Versand.
            // eslint-disable-next-line no-console
            console.log('\n[DEV-MOCK] Absenden empfangen – es wird KEINE E-Mail verschickt.');
            // eslint-disable-next-line no-console
            console.log('[DEV-MOCK] CSV-Dateiname:', result.csvFilename);
            // eslint-disable-next-line no-console
            console.log('[DEV-MOCK] CSV-Inhalt:\n' + result.csv + '\n');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, mock: true }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, errors: ['Ungültige Anfrage: ' + err.message] }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mockSubmitPlugin()],
});
