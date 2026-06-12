/**
 * Automatisches Zwischenspeichern in der Cloud (zusätzlich zum lokalen
 * Browser-Speicher). Entprellt, „best effort" – Fehler stören die Eingabe nie.
 *
 * Die vom Server vergebene Datensatz-ID wird im Browser gemerkt, damit
 * derselbe Eintrag aktualisiert (statt dupliziert) wird.
 */
import { loadDraft, saveDraft, clearDraft } from './draft.js';

const DEBOUNCE_MS = 4000;
const timers = {};

const idKey = (formKey) => `${formKey}-cloudid`;

export function getCloudId(formKey) {
  return loadDraft(idKey(formKey)) || undefined;
}
export function setCloudId(formKey, id) {
  if (id) saveDraft(idKey(formKey), id);
}
export function clearCloudId(formKey) {
  clearDraft(idKey(formKey));
}

/**
 * Plant eine Cloud-Speicherung. `hasContent` verhindert, dass völlig leere
 * Formulare gespeichert werden.
 */
export function scheduleCloudSave(formKey, type, data, hasContent) {
  if (!hasContent) return;
  clearTimeout(timers[formKey]);
  timers[formKey] = setTimeout(async () => {
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: getCloudId(formKey), type, data }),
      });
      const body = await res.json().catch(() => ({}));
      if (body && body.id) setCloudId(formKey, body.id);
    } catch {
      /* Zwischenspeichern ist optional – Netzwerkfehler ignorieren. */
    }
  }, DEBOUNCE_MS);
}
