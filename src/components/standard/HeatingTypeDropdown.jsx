import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HEATING_TYPES, HEATING_OTHER } from '../../lib/options.js';

/**
 * Kompakte Mehrfachauswahl für den Heizungstyp – direkt in der Tabellenzelle.
 * Ein Klick öffnet ein kleines Aufklapp-Menü mit Häkchen (nur Namen, keine
 * Ikonen). Ist „Was anderes / weiß nicht" angehakt, erscheint ein Freitextfeld.
 *
 * Das Menü wird per Portal an <body> gehängt und `position: fixed` anhand der
 * Button-Position gezeichnet. So erbt es weder die Tabellen-CSS-Regeln (die
 * sonst die Checkboxen verzerren) noch wird es vom Scroll-Container der Tabelle
 * abgeschnitten.
 */
export default function HeatingTypeDropdown({ system, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220, maxHeight: 340 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const types = system.heatingTypes || [];

  useLayoutEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const top = r.bottom + 4;
      setPos({
        top,
        left: r.left,
        width: Math.max(r.width, 230),
        maxHeight: Math.max(180, window.innerHeight - top - 12),
      });
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
    const onScroll = (e) => {
      // Scrollen IM Menü erlauben; nur bei Scroll außerhalb schließen,
      // damit das fixierte Menü nicht „abdriftet".
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
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
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="gf-hdrop-menu"
            style={{ top: pos.top, left: pos.left, minWidth: pos.width, maxHeight: pos.maxHeight }}
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
          </div>,
          document.body,
        )}
    </>
  );
}
