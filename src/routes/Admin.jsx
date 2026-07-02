import { useEffect, useState } from 'react';
import { TopBar } from '../components/Layout.jsx';
import { Hint } from '../components/Fields.jsx';
import PrefillLinkBuilder from '../components/admin/PrefillLinkBuilder.jsx';
import { encodePrefill } from '../lib/prefill.js';

/**
 * Interne Admin-Übersicht: zeigt alle eingereichten Erfassungen UND
 * zwischengespeicherten Entwürfe. Pro Eintrag lässt sich:
 *  - die CSV herunterladen,
 *  - ein Formular-Link erzeugen, um die Erfassung erneut zu öffnen,
 *  - der Eintrag in den Papierkorb legen (und dort wiederherstellen / endgültig löschen).
 *
 * Schutz über ADMIN_PASSWORD (serverseitig). Das Passwort wird nur im
 * sessionStorage gehalten und bei jeder Anfrage als Header mitgeschickt.
 */
const KEY = 'gf-admin-key';
const routeFor = (type) => (type === 'standard' ? 'standard' : 'sektorkopplung');

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [trashView, setTrashView] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [linkBuilderOpen, setLinkBuilderOpen] = useState(false);
  const [linkModal, setLinkModal] = useState(null); // { url } | null
  const [linkBusy, setLinkBusy] = useState('');       // id, während der Link erzeugt wird
  const [copied, setCopied] = useState(false);

  async function loadEntries(useKey, trashed = trashView) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/entries${trashed ? '?trashed=1' : ''}`, { headers: { 'x-admin-key': useKey } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setAuthed(false);
        setError(body.error || 'Zugriff nicht möglich.');
        return;
      }
      sessionStorage.setItem(KEY, useKey);
      setAuthed(true);
      setEntries(body.entries || []);
    } catch {
      setError('Netzwerkfehler.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (key) loadEntries(key, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchView(trashed) {
    setTrashView(trashed);
    loadEntries(key, trashed);
  }

  async function downloadCsv(id) {
    const res = await fetch(`/api/admin/entry?id=${encodeURIComponent(id)}&format=csv`, {
      headers: { 'x-admin-key': key },
    });
    if (!res.ok) {
      setError('CSV-Download fehlgeschlagen.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GF-${id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function openDetail(id) {
    const res = await fetch(`/api/admin/entry?id=${encodeURIComponent(id)}`, { headers: { 'x-admin-key': key } });
    const body = await res.json().catch(() => ({}));
    if (body.ok) setDetail(body.entry);
  }

  // Erzeugt einen Link, mit dem sich die Erfassung erneut öffnen lässt
  // (gleiches Verfahren wie bei den vorausgefüllten Links: Daten in D1, kurze ID).
  async function makeFormLink(id, type) {
    setLinkBusy(id);
    setError('');
    try {
      const detailRes = await fetch(`/api/admin/entry?id=${encodeURIComponent(id)}`, { headers: { 'x-admin-key': key } });
      const detailBody = await detailRes.json().catch(() => ({}));
      if (!detailBody.ok || !detailBody.entry) {
        setError('Daten des Eintrags konnten nicht geladen werden.');
        return;
      }
      const payload = detailBody.entry.data || {};
      const route = routeFor(type);
      const res = await fetch('/api/admin/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok && body.id) {
        setLinkModal({ url: `${window.location.origin}/${route}?p=${body.id}` });
      } else if (type === 'standard') {
        // Rückfall (nur klassisches Formular kann lange Links lesen).
        setLinkModal({ url: `${window.location.origin}/${route}?prefill=${encodePrefill(payload)}` });
      } else {
        setError(body.error || 'Link konnte nicht erzeugt werden.');
      }
    } catch {
      setError('Link konnte nicht erzeugt werden.');
    } finally {
      setLinkBusy('');
    }
  }

  async function trashAction(id, action) {
    setError('');
    try {
      const res = await fetch('/api/admin/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ id, action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) {
        setError(body.error || 'Aktion fehlgeschlagen.');
        return;
      }
      if (detail && detail.id === id) setDetail(null);
      loadEntries(key, trashView);
    } catch {
      setError('Netzwerkfehler.');
    }
  }

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* z. B. unter http nicht möglich – Link steht trotzdem im Feld */
    }
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    setAuthed(false);
    setKey('');
    setEntries([]);
  }

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString('de-DE') : '—');
  const shown = trashView ? entries : entries.filter((e) => filter === 'all' || e.status === filter);

  // ---- Login ----
  if (!authed) {
    return (
      <div className="gf-page">
        <TopBar />
        <div className="gf-center">
          <div className="gf-card" style={{ maxWidth: 380, width: '100%' }}>
            <h2 style={{ marginTop: 0 }}>Admin-Bereich</h2>
            <p className="gf-help" style={{ marginTop: 0 }}>Bitte das Admin-Passwort eingeben.</p>
            <input
              className="gf-input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEntries(key, false)}
              placeholder="Passwort"
            />
            {error && (
              <div style={{ marginTop: 12 }}>
                <Hint kind="error">{error}</Hint>
              </div>
            )}
            <div className="gf-actions">
              <span />
              <button className="gf-btn gf-btn-primary" disabled={!key || loading} onClick={() => loadEntries(key, false)}>
                {loading ? <span className="gf-spinner" /> : 'Anmelden'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Übersicht ----
  return (
    <div className="gf-page">
      <TopBar />
      <div className="gf-shell gf-shell-wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 className="gf-step-title" style={{ marginBottom: 0 }}>
            {trashView ? 'Papierkorb' : 'Erfassungen & Entwürfe'}
          </h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {!trashView && (
              <button className="gf-btn gf-btn-primary" onClick={() => setLinkBuilderOpen(true)}>
                + Vorausgefüllten Link erstellen
              </button>
            )}
            <button className="gf-btn gf-btn-ghost" onClick={logout}>Abmelden</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          {!trashView &&
            [
              ['all', 'Alle'],
              ['submitted', 'Eingereicht'],
              ['draft', 'Entwürfe'],
            ].map(([v, label]) => (
              <button key={v} className={`gf-chip${filter === v ? ' is-selected' : ''}`} onClick={() => setFilter(v)}>
                {label}
              </button>
            ))}
          <button className="gf-btn gf-btn-text" onClick={() => loadEntries(key, trashView)}>↻ Aktualisieren</button>
          <span style={{ flex: 1 }} />
          <button
            className={`gf-btn ${trashView ? 'gf-btn-primary' : 'gf-btn-ghost'}`}
            onClick={() => switchView(!trashView)}
          >
            {trashView ? '← Zurück zur Übersicht' : '🗑 Papierkorb'}
          </button>
        </div>

        {error && <Hint kind="error">{error}</Hint>}

        <p className="gf-help">
          {shown.length} {trashView ? 'Einträge im Papierkorb' : 'Einträge'}. Einträge werden nach 30 Tagen automatisch gelöscht.
        </p>

        <div className="gf-grid-wrap">
          <table className="gf-grid">
            <thead>
              <tr>
                <th>{trashView ? 'Gelöscht' : 'Zuletzt'}</th>
                <th>Status</th>
                <th>Typ</th>
                <th>Firma</th>
                <th>Ansprechpartner</th>
                <th>E-Mail</th>
                <th>Anlagen</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id}>
                  <td style={{ padding: '6px 8px' }}>{fmt(trashView ? e.deleted_at : e.updated_at)}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: e.status === 'submitted' ? 'var(--gf-jungle-dark)' : 'var(--gf-warning-dark)',
                      }}
                    >
                      {e.status === 'submitted' ? 'Eingereicht' : 'Entwurf'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{e.type === 'standard' ? 'Standard' : 'Sektorkopplung'}</td>
                  <td style={{ padding: '6px 8px' }}>{e.company || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{e.contact_name || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{e.contact_email || '—'}</td>
                  <td style={{ padding: '6px 8px' }}>{e.system_count ?? '—'}</td>
                  <td style={{ whiteSpace: 'nowrap', padding: '6px 8px' }}>
                    {trashView ? (
                      <>
                        <button className="gf-btn gf-btn-text" onClick={() => trashAction(e.id, 'restore')}>
                          Wiederherstellen
                        </button>
                        <button
                          className="gf-btn gf-btn-text"
                          style={{ color: 'var(--gf-error)' }}
                          onClick={() => {
                            if (window.confirm('Diesen Eintrag endgültig löschen? Das kann nicht rückgängig gemacht werden.')) {
                              trashAction(e.id, 'purge');
                            }
                          }}
                        >
                          Endgültig löschen
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="gf-btn gf-btn-text" onClick={() => openDetail(e.id)}>Details</button>
                        <button className="gf-btn gf-btn-text" disabled={linkBusy === e.id} onClick={() => makeFormLink(e.id, e.type)}>
                          {linkBusy === e.id ? '…' : 'Öffnen-Link'}
                        </button>
                        <button className="gf-btn gf-btn-text" onClick={() => downloadCsv(e.id)}>CSV</button>
                        <button
                          className="gf-btn gf-btn-text"
                          style={{ color: 'var(--gf-error)' }}
                          onClick={() => trashAction(e.id, 'delete')}
                          title="In den Papierkorb legen"
                        >
                          Löschen
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 16, textAlign: 'center', color: 'var(--gf-steel-smoke)' }}>
                    {trashView ? 'Der Papierkorb ist leer.' : 'Keine Einträge.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="gf-modal-overlay" onClick={() => setDetail(null)}>
          <div className="gf-card gf-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Eintrag {detail.id.slice(0, 8)}</h3>
              <button className="gf-btn gf-btn-text" onClick={() => setDetail(null)}>Schließen</button>
            </div>
            <p className="gf-help">
              {detail.type} · {detail.status} · erstellt {fmt(detail.created_at)}
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <button className="gf-btn gf-btn-primary" onClick={() => downloadCsv(detail.id)}>CSV herunterladen</button>
              <button className="gf-btn gf-btn-ghost" disabled={linkBusy === detail.id} onClick={() => makeFormLink(detail.id, detail.type)}>
                {linkBusy === detail.id ? 'Link wird erzeugt…' : 'Formular-Link erzeugen'}
              </button>
              <button
                className="gf-btn gf-btn-text"
                style={{ color: 'var(--gf-error)' }}
                onClick={() => trashAction(detail.id, 'delete')}
              >
                In den Papierkorb
              </button>
            </div>
            <pre
              style={{
                background: 'var(--gf-bg)',
                border: '1px solid var(--gf-polar-mist)',
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(detail.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {linkModal && (
        <div className="gf-modal-overlay" onClick={() => setLinkModal(null)}>
          <div className="gf-card gf-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Formular erneut öffnen</h3>
              <button className="gf-btn gf-btn-text" onClick={() => setLinkModal(null)}>Schließen</button>
            </div>
            <p className="gf-help" style={{ marginTop: 4 }}>
              Über diesen Link öffnet sich das Formular mit allen bereits erfassten Daten. Ideal, um eine Erfassung
              noch einmal anzusehen oder dem Kunden zum Weiterbearbeiten zu schicken.
            </p>
            <textarea
              readOnly
              className="gf-textarea"
              value={linkModal.url}
              style={{ minHeight: 70, fontFamily: 'monospace', fontSize: 13 }}
              onFocus={(e) => e.target.select()}
            />
            <div className="gf-actions">
              <a className="gf-btn gf-btn-ghost" href={linkModal.url} target="_blank" rel="noreferrer">
                Formular öffnen
              </a>
              <button type="button" className="gf-btn gf-btn-primary" onClick={() => copyLink(linkModal.url)}>
                {copied ? '✓ Kopiert' : 'Link kopieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {linkBuilderOpen && <PrefillLinkBuilder onClose={() => setLinkBuilderOpen(false)} />}
    </div>
  );
}
