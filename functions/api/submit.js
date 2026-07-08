/**
 * Cloudflare Pages Function – serverseitiger Endpunkt für "Absenden".
 *
 * Erreichbar unter:  POST /api/submit
 *
 * Ablauf (Abschnitt 3 der Aufgabe):
 *   1. Eingaben prüfen (Pflichtfelder vollständig?)
 *   2. CSV im GF-Anlagenlisten-Format erzeugen
 *   3. E-Mail an den GF-Mitarbeiter (Zusammenfassung + CSV als Anhang)
 *   4. Bestätigungs-E-Mail an den Kunden
 *
 * Sicherheit:
 *   - Der Brevo-API-Schlüssel steht NIE im Code, sondern in der
 *     Umgebungsvariable BREVO_API_KEY (Cloudflare-Secret).
 *   - Auch die Empfänger-Adresse des GF-Mitarbeiters kommt aus der
 *     Umgebungsvariable GF_RECIPIENT_EMAIL.
 *
 * Benötigte Umgebungsvariablen (in Cloudflare bzw. .dev.vars lokal):
 *   - BREVO_API_KEY        (Secret) – API-Schlüssel von Brevo
 *   - GF_RECIPIENT_EMAIL   – Empfänger bei Green Fusion (z. B. anfragen@green-fusion.de)
 *   - BREVO_SENDER_EMAIL   – verifizierte Absenderadresse (SPF/DKIM bei Brevo eingerichtet)
 *   - BREVO_SENDER_NAME    – Anzeigename des Absenders (optional, Standard "Green Fusion")
 *
 * Hinweis: Ist BREVO_API_KEY nicht gesetzt, läuft die Funktion im
 * "Mock-Modus": Sie validiert und erzeugt die CSV, verschickt aber KEINE
 * E-Mail. So lässt sich auch ohne Brevo-Konto testen.
 */

import { buildSubmission } from '../../shared/submission.js';
import { markSubmitted, setEmailStatus } from '../_lib/store.js';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Kodiert einen UTF-8-String (CSV) als Base64 – für den E-Mail-Anhang. */
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa ist in der Cloudflare-Workers-Umgebung verfügbar.
  return btoa(binary);
}

/** Ein einzelner Brevo-Versand. Wirft bei HTTP-Fehlern. */
async function sendBrevoEmail(apiKey, payload) {
  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo-Fehler (${res.status}): ${text}`);
  }
  return res.json().catch(() => ({}));
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, errors: ['Ungültiges JSON in der Anfrage.'] }, 400);
  }

  // Schritt 1 + 2: Validieren und CSV erzeugen (gemeinsame Logik mit dem Dev-Mock).
  const result = buildSubmission(data);
  if (!result.valid) {
    return json({ ok: false, errors: result.errors }, 422);
  }

  // Einreichung in der Datenbank festhalten (best effort – stört den Versand nicht).
  // Aktualisiert einen ggf. vorhandenen Entwurf (data.draftId) auf 'submitted'.
  let entryId = null;
  if (env.DB) {
    try {
      entryId = await markSubmitted(env.DB, { id: data.draftId, type: data.type, data });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('D1-Speicherung der Einreichung fehlgeschlagen:', err);
    }
  }

  // Mail-Status am Eintrag vermerken, damit ein Versand-Problem im Admin
  // sichtbar ist (statt still verloren zu gehen). Best effort.
  const recordEmailStatus = async (status, error = '') => {
    if (!entryId || !env.DB) return;
    try {
      await setEmailStatus(env.DB, entryId, status, error);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Mail-Status konnte nicht gespeichert werden:', err);
    }
  };

  const apiKey = env.BREVO_API_KEY;
  const recipient = env.GF_RECIPIENT_EMAIL;
  const senderEmail = env.BREVO_SENDER_EMAIL;
  const senderName = env.BREVO_SENDER_NAME || 'Green Fusion';

  // Mock-Modus: ohne Schlüssel kein echter Versand (lokal testen ohne Brevo).
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.log('[Mock] Kein BREVO_API_KEY gesetzt – es wird keine E-Mail verschickt.');
    await recordEmailStatus('kein_api_key', 'BREVO_API_KEY ist in dieser Umgebung nicht gesetzt.');
    return json({ ok: true, mock: true });
  }

  if (!recipient || !senderEmail) {
    // Konfigurationsfehler: Die Daten SIND gespeichert – also Erfolg für die
    // Kundin, aber deutliche Warnung im Admin (sofern D1 vorhanden).
    const msg = 'GF_RECIPIENT_EMAIL / BREVO_SENDER_EMAIL fehlt in der Server-Konfiguration.';
    // eslint-disable-next-line no-console
    console.error('E-Mail-Versand übersprungen:', msg);
    if (entryId) {
      await recordEmailStatus('fehlgeschlagen', msg);
      return json({ ok: true });
    }
    return json({ ok: false, errors: ['Server ist nicht vollständig konfiguriert (GF_RECIPIENT_EMAIL / BREVO_SENDER_EMAIL fehlt).'] }, 500);
  }

  const sender = { email: senderEmail, name: senderName };
  const csvBase64 = toBase64(result.csv);

  // Schritt 3: E-Mail an Green Fusion – Zusammenfassung + CSV als Anhang.
  try {
    await sendBrevoEmail(apiKey, {
      sender,
      to: [{ email: recipient }],
      replyTo: result.customerEmail ? { email: result.customerEmail, name: result.customerName || undefined } : undefined,
      // 📮 im Betreff, damit die interne Benachrichtigung im Postfach auffällt.
      subject:
        result.type === 'standard'
          ? '📮 Neue Anlagen-Erfassung (Standard Business Case)'
          : '📮 Neue Anlagen-Erfassung (Sektorkopplung)',
      htmlContent: result.summaryHtml,
      attachment: [{ content: csvBase64, name: result.csvFilename }],
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('E-Mail-Versand fehlgeschlagen:', err);
    if (entryId) {
      // Daten sind gespeichert → Erfolg für die Kundin, rote Warnung im Admin.
      await recordEmailStatus('fehlgeschlagen', String(err.message || err));
      return json({ ok: true });
    }
    // Ohne D1 wären die Daten sonst komplett verloren → Fehler anzeigen.
    return json(
      { ok: false, errors: ['Der E-Mail-Versand ist fehlgeschlagen. Bitte versuchen Sie es später erneut.'] },
      502,
    );
  }

  // Schritt 4: Bestätigungs-E-Mail an den Kunden (Fehler hier blockiert nichts –
  // die GF-Benachrichtigung ist raus, das Wichtigste ist erledigt).
  let confirmationError = '';
  if (result.customerEmail) {
    try {
      await sendBrevoEmail(apiKey, {
        sender,
        to: [{ email: result.customerEmail, name: result.customerName || undefined }],
        subject: 'Vielen Dank – Ihre Angaben sind bei uns angekommen',
        htmlContent: result.confirmationHtml,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Bestätigungs-Mail an den Kunden fehlgeschlagen:', err);
      confirmationError = `Bestätigung an Kunde fehlgeschlagen: ${String(err.message || err)}`;
    }
  }

  await recordEmailStatus('verschickt', confirmationError);
  return json({ ok: true });
}

/** Andere Methoden als POST sind nicht erlaubt. */
export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return new Response('Method Not Allowed', { status: 405 });
}
