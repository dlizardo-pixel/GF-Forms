/**
 * Sendet die gesammelten Formulardaten an die serverseitige Funktion.
 * Lokal (npm run dev) antwortet der Dev-Mock aus vite.config.js,
 * live antwortet functions/api/submit.js.
 */
export async function submitForm(payload) {
  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let body = {};
  try {
    body = await res.json();
  } catch {
    /* leere/ungültige Antwort */
  }

  if (!res.ok || !body.ok) {
    const errors = body.errors || ['Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.'];
    const err = new Error(errors.join(' '));
    err.errors = errors;
    throw err;
  }
  return body;
}
