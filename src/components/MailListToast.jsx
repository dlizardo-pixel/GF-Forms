import { useState } from 'react';
import { loadDraft, saveDraft } from '../lib/draft.js';

const KEY = 'gf-maillist-collapsed';

/**
 * Notausgang als Pop-up unten rechts: „Liste per Mail schicken".
 *
 * Lässt sich minimieren – bleibt dann als kleiner Reiter sichtbar, damit man es
 * jederzeit wieder öffnen kann (nie ganz weg). Der Zustand (auf/zu) wird im
 * Browser gemerkt, damit es nicht bei jedem Schritt erneut aufpoppt.
 */
export default function MailListToast({ mailtoHref }) {
  const [collapsed, setCollapsed] = useState(() => loadDraft(KEY) === true);

  function setState(value) {
    setCollapsed(value);
    saveDraft(KEY, value);
  }

  if (collapsed) {
    return (
      <button type="button" className="gf-toast-pill" onClick={() => setState(false)} title="Liste per Mail schicken">
        ✉ Liste per Mail schicken
      </button>
    );
  }

  return (
    <div className="gf-toast" role="complementary">
      <button type="button" className="gf-toast-min" onClick={() => setState(true)} title="Minimieren" aria-label="Minimieren">
        –
      </button>
      <strong style={{ display: 'block', marginBottom: 4, color: 'var(--gf-brand-darker)' }}>
        Schon eine Liste Ihrer Anlagen?
      </strong>
      <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gf-graphite)' }}>
        Excel-Tabelle, Bestandsliste oder Heizkostenabrechnung — schicken Sie sie uns einfach so, wie sie ist.
        Abtippen müssen Sie dann nichts.
      </p>
      <a className="gf-btn gf-btn-primary" href={mailtoHref} style={{ width: '100%' }}>
        Liste per Mail schicken
      </a>
    </div>
  );
}
