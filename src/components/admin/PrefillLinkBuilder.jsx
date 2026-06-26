import { useState } from 'react';
import { TextField, Hint } from '../Fields.jsx';
import ImportModal from '../standard/ImportModal.jsx';
import { encodePrefill } from '../../lib/prefill.js';

/**
 * Werkzeug zum Erzeugen eines vorausgefüllten Formular-Links für einen
 * Kunden. Green Fusion gibt die bekannten Daten ein (Ansprechpartner + die
 * Anlagen, idealerweise per Excel-/CSV-Import) und bekommt einen Link, den
 * sie dem Kunden per Mail schicken. Der Kunde klickt → das Formular ist schon
 * gefüllt; er ergänzt nur das Fehlende (z. B. den Heizungstyp).
 *
 * Implementierung: alle Daten werden in den URL-Parameter `?prefill=…`
 * verpackt (base64-url-kodiert). Kein zusätzlicher Server-Aufruf nötig.
 */
export default function PrefillLinkBuilder({ onClose }) {
  const [contactName, setContactName] = useState('');
  const [company, setCompany] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [systems, setSystems] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImport = (newSystems) => {
    setSystems((arr) => [...arr, ...newSystems]);
    setImportOpen(false);
  };

  // Heizungstyp aus dem Prefill bewusst NICHT mit übernehmen — das ist genau
  // das Feld, das der Kunde noch ausfüllen soll. So sieht er, dass dort noch
  // etwas zu tun ist.
  const cleanedSystems = systems.map((s) => ({ ...s, heatingType: '' }));

  const payload = {
    project: { contactName, company, contactEmail },
    systems: cleanedSystems,
  };
  const encoded = systems.length ? encodePrefill(payload) : '';
  // Basis-URL aus dem aktuellen Origin – funktioniert lokal und live.
  const link = encoded ? `${window.location.origin}/standard?prefill=${encoded}` : '';
  const tooLong = link.length > 6000; // Browser-Limit-Faustregel

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Kopieren nicht möglich (z. B. http) – egal, Link steht trotzdem im Feld */
    }
  }

  const removeSystem = (i) => setSystems((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <div className="gf-modal-overlay" onClick={onClose}>
      <div className="gf-card gf-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Vorausgefüllten Link erstellen</h3>
          <button className="gf-btn gf-btn-text" onClick={onClose}>Schließen</button>
        </div>
        <p className="gf-help" style={{ marginTop: 4 }}>
          Tragen Sie hier ein, was Sie über den Kunden schon wissen. Der Kunde bekommt einen Link, in dem
          alles bereits eingetragen ist — er ergänzt nur noch den Heizungstyp und bestätigt.
        </p>

        <h4 style={{ marginBottom: 8 }}>Ansprechpartner</h4>
        <TextField label="Name" value={contactName} onChange={setContactName} />
        <TextField label="Unternehmensname" value={company} onChange={setCompany} />
        <TextField label="E-Mail" value={contactEmail} onChange={setContactEmail} type="email" />

        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Anlagen ({systems.length})</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" className="gf-btn gf-btn-primary" onClick={() => setImportOpen(true)}>
            Anlagen importieren (Excel/CSV)
          </button>
          {systems.length > 0 && (
            <button type="button" className="gf-btn gf-btn-text" onClick={() => setSystems([])}>
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

        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Link</h4>
        {!systems.length && (
          <Hint kind="soft">Bitte mindestens eine Anlage hinzufügen, damit ein Link entstehen kann.</Hint>
        )}
        {tooLong && (
          <Hint kind="soft">
            Achtung: Dieser Link ist sehr lang ({link.length.toLocaleString('de-DE')} Zeichen) und funktioniert
            in manchen E-Mail-Programmen evtl. nicht zuverlässig. Bei sehr vielen Anlagen besser den
            Notausgang-Mailweg nutzen.
          </Hint>
        )}
        <textarea
          readOnly
          className="gf-textarea"
          value={link}
          placeholder="(noch leer)"
          style={{ minHeight: 100, fontFamily: 'monospace', fontSize: 12 }}
          onFocus={(e) => e.target.select()}
        />

        <div className="gf-actions">
          <span />
          <button
            type="button"
            className="gf-btn gf-btn-primary"
            disabled={!link}
            onClick={copyLink}
          >
            {copied ? '✓ Kopiert' : 'Link kopieren'}
          </button>
        </div>

        {importOpen && (
          <ImportModal project={{}} onImport={handleImport} onClose={() => setImportOpen(false)} />
        )}
      </div>
    </div>
  );
}
