import { Fragment, useState } from 'react';
import { lookupPlz } from '../../lib/plz.js';
import { Hint } from '../Fields.jsx';
import { makeSite, isSiteComplete } from '../../lib/sektorModel.js';
import { siteHeatPumps, missingControllerCount } from '../../../shared/heatPumps.js';
import { SK_COMPONENTS } from '../../lib/options.js';
import SiteEditor from './SiteEditor.jsx';

// Anzahl der Kernspalten (für colSpan der Detailzeile).
const COL_COUNT = 7;

// Kurzlabels der Komponenten für die Zusammenfassungsspalte.
const COMPONENT_LABEL = Object.fromEntries(SK_COMPONENTS.map((c) => [c.key, c.label]));

/**
 * Tabellen-/Rastermodus für Sektorkopplungs-Anlagen (ab 3 Anlagen) –
 * analog zum klassischen SystemGrid. Adresse/PLZ/Stadt/Wohneinheiten stehen
 * direkt in der Zeile; alle fachlichen Details (Komponenten, PV, Steuerung,
 * Einsparpotenziale …) klappen je Anlage über „Details" auf.
 */
export default function SektorGrid({ sites, setSites }) {
  const [expanded, setExpanded] = useState(() => new Set());

  const updateSite = (index, partial) =>
    setSites((arr) => arr.map((s, i) => (i === index ? { ...s, ...partial } : s)));

  const addRow = () => setSites((arr) => [...arr, makeSite()]);

  const duplicateRow = (index) =>
    setSites((arr) => {
      const copy = [...arr];
      copy.splice(index + 1, 0, JSON.parse(JSON.stringify(arr[index])));
      return copy;
    });

  const deleteRow = (index) => setSites((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== index) : arr));

  // „Werte von oben übernehmen": vorige Zeile als Ausgangswert (ohne Adresse).
  const copyFromAbove = (index) =>
    setSites((arr) => arr.map((s, i) => (i === index ? makeSite(arr[index - 1]) : s)));

  const toggleExpand = (index) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });

  async function handlePlz(index, value) {
    updateSite(index, { plz: value });
    if (/^\d{5}$/.test(value.trim())) {
      const res = await lookupPlz(value);
      if (res) updateSite(index, { city: res.city, lat: res.lat, lng: res.lng });
    }
  }

  const componentSummary = (s) => {
    const sel = Array.isArray(s.selectedComponents) ? s.selectedComponents : [];
    if (!sel.length) return '';
    const pumpCount = siteHeatPumps(s).length;
    return sel
      .map((k) => {
        const label = COMPONENT_LABEL[k] || k;
        // Mehrere verschiedene Wärmepumpen in der Zeile sichtbar machen.
        return k === 'waermepumpe' && pumpCount > 1 ? `${label} (${pumpCount})` : label;
      })
      .join(', ');
  };

  return (
    <div>
      <Hint kind="info">
        Eine Zeile pro Anlage. Orange unterstrichene Felder brauchen wir; der Rest ist freiwillig. Über
        „Details" öffnen Sie je Anlage die Angaben zu Wärmepumpe, PV, Steuerung und Einsparpotenzialen.
      </Hint>

      {/* Werkzeugleiste */}
      <div style={{ display: 'flex', gap: 'var(--gf-space-2)', flexWrap: 'wrap', margin: '12px 0' }}>
        <button type="button" className="gf-btn gf-btn-ghost" onClick={addRow}>
          + Anlage hinzufügen
        </button>
      </div>

      <div className="gf-grid-wrap">
        <table className="gf-grid gf-grid-sektor">
          <thead>
            <tr>
              <th>Nr.</th>
              <th>Wo steht die Anlage?</th>
              <th>PLZ</th>
              <th>Stadt</th>
              <th>Wohneinheiten</th>
              <th>Komponenten</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s, i) => {
              const complete = isSiteComplete(s);
              const isOpen = expanded.has(i);
              const summary = componentSummary(s);
              return (
                <Fragment key={i}>
                  <tr>
                    <td className="gf-rownum" title={complete ? 'vollständig' : 'es fehlt noch die Adresse'}>
                      <button
                        type="button"
                        className="gf-btn gf-btn-text"
                        style={{ padding: 2, fontSize: 13 }}
                        onClick={() => toggleExpand(i)}
                        title="Details auf-/zuklappen"
                      >
                        {isOpen ? '▾' : '▸'}
                      </button>
                      {complete ? '✓' : ''}
                      {i + 1}
                    </td>
                    <td>
                      <input
                        className="gf-grid-req"
                        value={s.streetHeating}
                        onChange={(e) => updateSite(i, { streetHeating: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className="gf-grid-req gf-col-plz"
                        value={s.plz}
                        onChange={(e) => handlePlz(i, e.target.value)}
                      />
                    </td>
                    <td>
                      <input className="gf-col-city" value={s.city} onChange={(e) => updateSite(i, { city: e.target.value })} />
                    </td>
                    <td>
                      <input
                        className="gf-col-num"
                        type="number"
                        value={s.residentialUnits}
                        onChange={(e) => updateSite(i, { residentialUnits: e.target.value })}
                        title="Wie viele Wohnungen hängen dran? Grobe Zahl reicht."
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="gf-btn gf-btn-text"
                        style={{ padding: 2, fontSize: 13, textAlign: 'left' }}
                        onClick={() => toggleExpand(i)}
                        title={
                          missingControllerCount(s) > 0
                            ? 'Regler / Controller der Wärmepumpe fehlt noch — hier öffnen'
                            : 'Komponenten & Details bearbeiten'
                        }
                      >
                        {summary || <span style={{ color: 'var(--gf-glaciar-gray)' }}>+ Details</span>}
                        {missingControllerCount(s) > 0 && (
                          <span style={{ color: 'var(--gf-warning-dark)', display: 'block' }}>⚠ Regler fehlt</span>
                        )}
                      </button>
                    </td>
                    <td className="gf-col-actions">
                      {i > 0 && (
                        <button
                          type="button"
                          className="gf-btn gf-btn-text"
                          style={{ fontSize: 15, padding: 2 }}
                          onClick={() => copyFromAbove(i)}
                          title="Werte von oben übernehmen (ohne Adresse)"
                        >
                          ↧
                        </button>
                      )}
                      <button
                        type="button"
                        className="gf-btn gf-btn-text"
                        style={{ fontSize: 15, padding: 2 }}
                        onClick={() => duplicateRow(i)}
                        title="Zeile duplizieren"
                      >
                        ⧉
                      </button>
                      {sites.length > 1 && (
                        <button
                          type="button"
                          className="gf-btn gf-btn-text"
                          style={{ fontSize: 15, padding: 2, color: 'var(--gf-error)' }}
                          onClick={() => deleteRow(i)}
                          title="Zeile löschen"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={COL_COUNT} style={{ background: 'var(--gf-bg)', padding: 'var(--gf-space-4)' }}>
                        <SiteEditor site={s} onChange={(partial) => updateSite(i, partial)} hideLocation />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
