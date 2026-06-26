import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HEATING_TYPES, HEATING_OTHER } from '../../lib/options.js';

/**
 * Kompakte Mehrfachauswahl für den Heizungstyp – direkt in der Tabellenzelle.
 * Ein Klick öffnet ein kleines Aufklapp-Menü mit Häkchen (nur Namen, keine
 * Ikonen). Ist „Was anderes / weiß nicht" angehakt, erscheint ein Freitextfeld.
 *
 * Das Menü wird `position: fixed` anhand der Button-Position gezeichnet, damit
 * es nicht vom horizontalen Scroll-Container der Tabelle abgeschnitten wird.
 */
export default function HeatingTypeDropdown({ system, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const types = system.heatingTypes || [];

  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 210) });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    // Beim Scrollen schließen, damit das fixierte Menü nicht „abdriftet".
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const toggle = (t) => {
    const set = new Set(types);
    set.has(t) ? set.delete(t) : set.add(t);
    onChange({ heatingTypes: [...set] });
  };

  const label = types.join(', ');

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="gf-hdrop-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Heizungstyp(en) wählen"
        style={{
          color: label ? 'var(--gf-graphite)' : 'var(--gf-sunstone)',
          borderBottom: label ? '1px solid transparent' : '2px solid var(--gf-sunstone)',
        }}
      >
        {label || '– wählen –'}
      </button>
      {open && (
        <div
          ref={menuRef}
          className="gf-hdrop-menu"
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          {HEATING_TYPES.map((t) => (
            <label key={t} className="gf-hdrop-item">
              <input type="checkbox" checked={types.includes(t)} onChange={() => toggle(t)} />
              <span>{t}</span>
            </label>
          ))}
          {types.includes(HEATING_OTHER) && (
            <input
              className="gf-input gf-hdrop-other"
              value={system.heatingTypeOther || ''}
              placeholder="Bitte kurz beschreiben"
              onChange={(e) => onChange({ heatingTypeOther: e.target.value })}
            />
          )}
        </div>
      )}
    </>
  );
}
