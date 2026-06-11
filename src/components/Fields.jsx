/**
 * Wiederverwendbare Feld-Komponenten im Green-Fusion-Stil.
 * Alle Beschriftungen sind auf Deutsch.
 */
import { useEffect, useRef, useState } from 'react';

/** Textfeld */
export function TextField({ label, value, onChange, required, help, placeholder, type = 'text', suffix }) {
  return (
    <div className="gf-field">
      <label className="gf-label">
        {label}
        {required && <span className="gf-req">*</span>}
      </label>
      {help && <p className="gf-help">{help}</p>}
      <div className={suffix ? 'gf-input-suffix' : undefined}>
        <input
          className="gf-input"
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="gf-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

/** Zahlenfeld (mit optionaler Einheit als Suffix) */
export function NumberField({ label, value, onChange, required, help, suffix, min = 0, placeholder }) {
  return (
    <div className="gf-field">
      <label className="gf-label">
        {label}
        {required && <span className="gf-req">*</span>}
      </label>
      {help && <p className="gf-help">{help}</p>}
      <div className={suffix ? 'gf-input-suffix' : undefined}>
        <input
          className="gf-input"
          type="number"
          inputMode="decimal"
          min={min}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="gf-suffix">{suffix}</span>}
      </div>
    </div>
  );
}

/** Freitext */
export function TextAreaField({ label, value, onChange, required, help, placeholder }) {
  return (
    <div className="gf-field">
      <label className="gf-label">
        {label}
        {required && <span className="gf-req">*</span>}
      </label>
      {help && <p className="gf-help">{help}</p>}
      <textarea
        className="gf-textarea"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Einfachauswahl als große Karten */
export function ChoiceField({ label, value, onChange, options, required, help }) {
  return (
    <div className="gf-field">
      <label className="gf-label">
        {label}
        {required && <span className="gf-req">*</span>}
      </label>
      {help && <p className="gf-help">{help}</p>}
      <div className="gf-choices">
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          const icon = typeof opt === 'string' ? null : opt.icon;
          const selected = value === val;
          return (
            <button
              type="button"
              key={val}
              className={`gf-choice${selected ? ' is-selected' : ''}`}
              onClick={() => onChange(val)}
            >
              <span className="gf-radio" aria-hidden="true" />
              {icon && <img src={icon} alt="" className="gf-choice-icon" />}
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Auswahl als Dropdown (kompakter, z. B. Projektebene) */
export function SelectField({ label, value, onChange, options, required, help }) {
  return (
    <div className="gf-field">
      <label className="gf-label">
        {label}
        {required && <span className="gf-req">*</span>}
      </label>
      {help && <p className="gf-help">{help}</p>}
      <select className="gf-select" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/** Ja/Nein-Schalter */
export function ToggleField({ label, value, onChange, help }) {
  return (
    <div className="gf-field">
      <label className="gf-label">{label}</label>
      {help && <p className="gf-help">{help}</p>}
      <div className="gf-toggle" role="group">
        <button type="button" className={value === true ? 'is-on' : ''} onClick={() => onChange(true)}>
          Ja
        </button>
        <button type="button" className={value === false ? 'is-on' : ''} onClick={() => onChange(false)}>
          Nein
        </button>
      </div>
    </div>
  );
}

/** Mehrfachauswahl als Chips */
export function MultiSelectField({ label, value = [], onChange, options, help }) {
  const toggle = (key) => {
    const set = new Set(value);
    set.has(key) ? set.delete(key) : set.add(key);
    onChange([...set]);
  };
  return (
    <div className="gf-field">
      <label className="gf-label">{label}</label>
      {help && <p className="gf-help">{help}</p>}
      <div className="gf-chips">
        {options.map((opt) => {
          const key = typeof opt === 'string' ? opt : opt.key;
          const lbl = typeof opt === 'string' ? opt : opt.label;
          const icon = typeof opt === 'string' ? null : opt.icon;
          return (
            <button
              type="button"
              key={key}
              className={`gf-chip${value.includes(key) ? ' is-selected' : ''}`}
              onClick={() => toggle(key)}
            >
              {icon && <img src={icon} alt="" className="gf-chip-icon" />}
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Vorschlagsliste (Tippen + Vorschläge), erlaubt auch freie Eingabe */
export function AutocompleteField({ label, value, onChange, suggestions = [], required, help, placeholder }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const q = (value || '').toLowerCase();
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);

  return (
    <div className="gf-field" ref={ref}>
      <label className="gf-label">
        {label}
        {required && <span className="gf-req">*</span>}
      </label>
      {help && <p className="gf-help">{help}</p>}
      <div className="gf-autocomplete">
        <input
          className="gf-input"
          value={value ?? ''}
          placeholder={placeholder || 'Tippen oder auswählen…'}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, filtered.length - 1));
            if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
            if (e.key === 'Enter' && active >= 0 && filtered[active]) {
              e.preventDefault();
              onChange(filtered[active]);
              setOpen(false);
            }
          }}
        />
        {open && filtered.length > 0 && (
          <ul className="gf-suggestions">
            {filtered.map((s, i) => (
              <li
                key={s}
                className={i === active ? 'is-active' : ''}
                onMouseDown={() => {
                  onChange(s);
                  setOpen(false);
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Sanfter Hinweis / Fehlerblock */
export function Hint({ kind = 'soft', children }) {
  return <div className={`gf-hint gf-hint-${kind}`}>{children}</div>;
}
