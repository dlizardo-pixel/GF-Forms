import { useEffect, useState } from 'react';
import { TopBar } from '../components/Layout.jsx';
import { Hint } from '../components/Fields.jsx';
import PrefillLinkBuilder from '../components/admin/PrefillLinkBuilder.jsx';

/**
 * Interne Admin-Übersicht: zeigt alle eingereichten Erfassungen UND
 * zwischengespeicherten Entwürfe. Pro Eintrag lässt sich die CSV herunterladen.
 *
 * Schutz über ADMIN_PASSWORD (serverseitig). Das Passwort wird nur im
 * sessionStorage gehalten und bei jeder Anfrage als Header mitgeschickt.
 */
const KEY = 'gf-admin-key';

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [linkBuilderOpen, setLinkBuilderOpen] = useState(false);

  async function loadEntries(useKey) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/entries', { headers: { 'x-admin-key': useKey } });
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
    if (key) loadEntries(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function logout() {
    sessionStorage.removeItem(KEY);
    setAuthed(false);
    setKey('');
    setEntries([]);
  }

  const fmt = (iso) => (iso ? new Date(iso).toLocaleString('de-DE') : '—');
  const shown = entries.filter((e) => filter === 'all' || e.status === filter);

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
              onKeyDown={(e) => e.key === 'Enter' && loadEntries(key)}
              placeholder="Passwort"
            />
            {error && (
              <div style={{ marginTop: 12 }}>
                <Hint kind="error">{error}</Hint>
              </div>
            )}
            <div className="gf-actions">
              <span />
              <button className="gf-btn gf-btn-primary" disabled={!key || loading} onClick={() => loadEntries(key)}>
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
          <h1 className="gf-step-title" style={{ marginBottom: 0 }}>Erfassungen &amp; Entwürfe</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="gf-btn gf-btn-primary" onClick={() => setLinkBuilderOpen(true)}>
              + Vorausgefüllten Link erstellen
            </button>
            <button className="gf-btn gf-btn-ghost" onClick={logout}>Abmelden</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
          {[
            ['all', 'Alle'],
            ['submitted', 'Eingereicht'],
            ['draft', 'Entwürfe'],
          ].map(([v, label]) => (
            <button key={v} className={`gf-chip${filter === v ? ' is-selected' : ''}`} onClick={() => setFilter(v)}>
              {label}
            </button>
          ))}
          <button className="gf-btn gf-btn-text" onClick={() => loadEntries(key)}>↻ Aktualisieren</button>
        </div>

        {error && <Hint kind="error">{error}</Hint>}

        <p className="gf-help">{shown.length} Einträge. Entwürfe werden nach 30 Tagen automatisch gelöscht.</p>

        <div className="gf-grid-wrap">
          <table className="gf-grid">
            <thead>
              <tr>
                <th>Zuletzt</th>
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
                  <td style={{ padding: '6px 8px' }}>{fmt(e.updated_at)}</td>
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
                    <button className="gf-btn gf-btn-text" onClick={() => openDetail(e.id)}>Details</button>
                    <button className="gf-btn gf-btn-text" onClick={() => downloadCsv(e.id)}>CSV</button>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 16, textAlign: 'center', color: 'var(--gf-steel-smoke)' }}>
                    Keine Einträge.
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
            <div style={{ marginBottom: 12 }}>
              <button className="gf-btn gf-btn-primary" onClick={() => downloadCsv(detail.id)}>CSV herunterladen</button>
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

      {linkBuilderOpen && <PrefillLinkBuilder onClose={() => setLinkBuilderOpen(false)} />}
    </div>
  );
}
