/**
 * Abbildung einer Sektorkopplungs-Einreichung auf das flache JSON, das Joshuas
 * n8n-Flow ("TF Survey to SC Project List") erwartet.
 *
 * Die Spaltennamen und die Wortwahl der Antworten stehen zentral in
 * shared/sektorExport.js — dieselbe Quelle, aus der auch die CSV entsteht.
 * Damit können Sheet-Export und n8n-Weitergabe nicht auseinanderlaufen.
 *
 * EIN Objekt pro Anlage (Joshuas Logik: 1 Zeile = 1 Notion-Projekt). Der
 * Aufrufer schickt jedes Objekt in einem EIGENEN POST — ein Webhook-Aufruf mit
 * einem Array wäre in n8n nur EIN Item und würde nur eine Zeile schreiben.
 */

import { FORM_COLUMNS, buildSektorRows } from './sektorExport.js';

// Fallback-Ansprechpartner: der Flow verwirft Einträge, bei denen
// „Ihr Ansprechpartner bei Green Fusion" leer ist (Filter New Entries).
export const DEFAULT_GF_CONTACT = 'Daniel Lizardo';

// Spalten, die der Flow nicht braucht (Alt-Dubletten und GF-interne Bewertung).
const SKIP = new Set(['Nutzung von PV-Strom in ihrem Gebäude? 2', 'Spalte 19', '', 'Bewertung']);

/**
 * Liefert ein Array flacher Objekte (eines je Anlage) für den n8n-Webhook.
 * Für andere Formulartypen (Standard) leeres Array – der SK-Flow ist speziell.
 */
export function buildN8nPayloads(data, { gfContact = DEFAULT_GF_CONTACT, now = new Date() } = {}) {
  if (!data || data.type !== 'sektorkopplung') return [];

  return buildSektorRows(data, { gfContact, now }).map((row) => {
    const payload = {};
    for (const col of FORM_COLUMNS) {
      if (!SKIP.has(col)) payload[col] = row[col];
    }
    // Zusatzfelder, mit denen sich die Zeilen einer Einreichung auseinanderhalten
    // lassen (hilfreich für Dubletten-Filter und Rückverfolgung im Sheet).
    payload['Anlage Nr.'] = row['Anlage Nr.'];
    payload['Einreichung'] = row['Einreichung'];
    return payload;
  });
}
