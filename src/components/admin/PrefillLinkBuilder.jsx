import { useState } from 'react';
import { TextField, Hint } from '../Fields.jsx';
import ImportModal from '../standard/ImportModal.jsx';
import { encodePrefill } from '../../lib/prefill.js';

/**
 * Werkzeug zum Erzeugen eines vorausgefüllten Formular-Links für einen Kunden.
 * Green Fusion gibt die bekannten Daten ein (Ansprechpartner + Anlagen per
 * Excel-/CSV-Import) und bekommt einen kurzen Link zum Verschicken.
 *
 * Der Link nutzt eine kurze ID (`?p=…`); die Daten liegen in D1. Ist keine
 * Datenbank erreichbar, wird als Rückfalllösung ein langer, selbst­tragender
 * Link (`?prefill=<base64>`) erzeugt.
 */
export default function PrefillLinkBuilder({ onClose }) {
  const [contactName, setContactName] = useState('');
  const [company, setCompany] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [systems, setSystems] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [link, setLink] = useState('');
  const [linkNote, setLinkNote] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImport = (newSystems) => {
    setSystems((arr) => [...arr, ...newSystems]);
    setLink(''); // Daten geändert → alter Link ungültig
    setImportOpen(false);
  };
  const removeSystem = (i) => {
    setSystems((arr) => arr.filter((_, idx) => idx !== i));
    setLink('');
  };

  // Heizungstyp bewusst NICHT mitgeben — das soll der Kunde ergänzen.
  const buildPayload = () => ({
    project: { contactName, company, contactEmail },
    systems: systems.map((s) => ({ ...s, heatingType: '' })),
  });

  async function generate() {
    setGenerating(true);
    setLinkNote('');
    const payload = buildPayload();
    const key = sessionStorage.getItem('gf-admin-key') || '';
    try {
      const res = await fetch('/api/admin/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify({ payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok && body.id) {
        setLink(`${window.location.origin}/standard?p=${body.id}`);
      } else {
        setLink(`${window.location.origin}/standard?prefill=${encodePrefill(payload)}`);
        setLinkNote('Kurzlink nicht verfügbar (Datenbank nicht erreichbar) — stattdessen Langlink erzeugt.');
      }
    } catch {
      setLink(`${window.location.origin}/standard?prefill=${encodePrefill(payload)}`);
      setLinkNote('Kurzlink nicht verfügbar — stattdessen Langlink erzeugt.');
    }
    setGenerating(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* z. B. unter http nicht möglich – Link steht trotzdem im Feld */
    }
  }

  return (
    <div className="gf-modal-overlay" onClick={onClose}>
      <div className="gf-card gf-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Vorausgefüllten Link erstellen</h3>
          <button className="gf-btn gf-btn-text" onClick={onClose}>Schließen</button>
        </div>
        <p className="gf-help" style={{ marginTop: 4 }}>
          Tragen Sie ein, was Sie über den Kunden schon wissen. Der Kunde bekommt einen Link, in dem alles
          bereits eingetragen ist — er ergänzt nur noch den Heizungstyp und bestätigt.
        </p>

        <h4 style={{ marginBottom: 8 }}>Ansprechpartner</h4>
        <TextField label="Name" value={contactName} onChange={(v) => { setContactName(v); setLink(''); }} />
        <TextField label="Unternehmensname" value={company} onChange={(v) => { setCompany(v); setLink(''); }} />
        <TextField label="E-Mail" value={contactEmail} onChange={(v) => { setContactEmail(v); setLink(''); }} type="email" />

        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Anlagen ({systems.length})</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" className="gf-btn gf-btn-primary" onClick={() => setImportOpen(true)}>
            Anlagen importieren (Excel/CSV)
          </button>
          {systems.length > 0 && (
            <button type="button" className="gf-btn gf-btn-text" onClick={() => { setSystems([]); setLink(''); }}>
              Alle entfernen
            </button>
          )}
        </div>

        {systems.length > 0 && (
          <div className="gf-grid-wrap" style={{ marginBottom: 12 }}>
            <table className="gf-grid">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Straße &amp; Hausnr.</th>
                  <th>PLZ</th>
                  <th>Stadt</th>
                  <th>Fläche m²</th>
                  <th>Verbrauch</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {systems.map((s, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 8px' }}>{i + 1}</td>
                    <td style={{ padding: '4px 8px' }}>{s.streetHeating || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{s.plz || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{s.city || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{s.heatedAreaM2 || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>{s.consumptionLastYear || '—'}</td>
                    <td style={{ padding: '4px 8px' }}>
                      <button
                        className="gf-btn gf-btn-text"
                        style={{ color: 'var(--gf-error)', fontSize: 15, padding: 2 }}
                        onClick={() => removeSystem(i)}
                        title="Entfernen"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="gf-actions">
          <span />
          <button type="button" className="gf-btn gf-btn-primary" disabled={!systems.length || generating} onClick={generate}>
            {generating ? <span className="gf-spinner" /> : link ? 'Link neu erstellen' : 'Link erstellen'}
          </button>
        </div>

        {link && (
          <>
            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Link zum Verschicken</h4>
            {linkNote && <Hint kind="soft">{linkNote}</Hint>}
            <textarea
              readOnly
              className="gf-textarea"
              value={link}
              style={{ minHeight: 70, fontFamily: 'monospace', fontSize: 13 }}
              onFocus={(e) => e.target.select()}
            />
            <div className="gf-actions">
              <span />
              <button type="button" className="gf-btn gf-btn-primary" onClick={copyLink}>
                {copied ? '✓ Kopiert' : 'Link kopieren'}
              </button>
            </div>
          </>
        )}

        {importOpen && <ImportModal project={{}} onImport={handleImport} onClose={() => setImportOpen(false)} />}
      </div>
    </div>
  );
}
