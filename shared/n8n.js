/**
 * Abbildung einer Sektorkopplungs-Einreichung auf das flache JSON, das Joshuas
 * n8n-Flow ("TF Survey to SC Project List") erwartet.
 *
 * Der Flow liest die Felder über die deutschen Spaltennamen des früheren
 * Typeform-/Google-Sheets-Exports (z. B. `$json['Hersteller der Wärmepumpe']`).
 * Damit sein Flow beim Umstieg auf GF-Forms nahezu unverändert bleibt, liefern
 * wir genau diese Schlüsselnamen — inklusive der Trailing-Spaces, die im Flow so
 * referenziert sind ('Andere Wärmeerzeuger ', 'PV-Anlage Konfiguration ',
 * 'PV-Partner '). Bitte diese Schlüssel NICHT „aufräumen".
 *
 * Ein Objekt pro Anlage (Joshuas Logik: 1 Zeile = 1 Notion-Projekt).
 */

import { STATUS_LABELS, formatOtherHeatSources, formatPvOperator } from './sektorLabels.js';
import { joinHeatPumpField } from './heatPumps.js';

// Fallback-Ansprechpartner: der Flow verwirft Einträge, bei denen
// „Ihr Ansprechpartner bei Green Fusion" leer ist (Filter New Entries).
export const DEFAULT_GF_CONTACT = 'Daniel Lizardo';

const has = (site, key) => Array.isArray(site.selectedComponents) && site.selectedComponents.includes(key);

/** 'läuft schon' | 'ist geplant' | '' – nur wenn die Komponente gewählt ist. */
function statusLabel(site, key) {
  if (!has(site, key)) return '';
  return STATUS_LABELS[(site.componentStatus || {})[key]] || '';
}

/** "Straße 1, 10115 Berlin" */
function addressLine(site) {
  const cityLine = [site.plz, site.city].filter(Boolean).join(' ');
  return [site.streetHeating, cityLine].filter(Boolean).join(', ');
}

/** Deutscher Zeitstempel in Europe/Berlin, z. B. "23.07.2026 14:30". */
function nowStamp() {
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.day}.${p.month}.${p.year} ${p.hour}:${p.minute}`;
}

/**
 * Liefert ein Array flacher Objekte (eines je Anlage) für den n8n-Webhook.
 * Für andere Formulartypen (Standard) leeres Array – der SK-Flow ist speziell.
 */
export function buildN8nPayloads(data, { gfContact = DEFAULT_GF_CONTACT } = {}) {
  if (!data || data.type !== 'sektorkopplung') return [];

  const contact = data.contact || data; // rückwärtskompatibel
  const sites = Array.isArray(data.sites) ? data.sites : [data];

  return sites.map((site) => {
    const c = site.components || {};
    const emsAnswer =
      site.existingEms === true
        ? site.existingEmsModbus
          ? `Ja (Modbus: ${site.existingEmsModbus})`
          : 'Ja'
        : site.existingEms === false
          ? 'Nein'
          : '';

    return {
      Zeitstempel: nowStamp(),
      'Adressen aller Gebäude mit gleichen Eigenschaften': addressLine(site),
      'Ihr Unternehmen': contact.company || '',
      'Ihr Ansprechpartner bei Green Fusion': gfContact,

      // Mehrere verschiedene Wärmepumpen je Anlage werden in denselben Schlüsseln
      // mit " | " geliefert (der Flow bleibt damit unverändert); das i-te
      // Teilstück gehört in jedem Feld zur i-ten Wärmepumpe.
      'Status Wärmepumpen-System': statusLabel(site, 'waermepumpe'),
      'Wärmepumpen-Konfiguration': has(site, 'waermepumpe') ? joinHeatPumpField(site, 'topology') : '',
      'Hersteller der Wärmepumpe': has(site, 'waermepumpe') ? joinHeatPumpField(site, 'model') : '',
      'Wärmepumpen Controller (Modell- oder Serienname, z.B. ISG-Web)': has(site, 'waermepumpe')
        ? joinHeatPumpField(site, 'controller')
        : '',
      'Andere Wärmeerzeuger ': formatOtherHeatSources(site),

      'Status PV-Anlage': statusLabel(site, 'pv'),
      'PV-Anlage Konfiguration ': has(site, 'pv') && c.pvKwp ? `${c.pvKwp} kWp` : '',
      'PV-Wechselrichter Hersteller': has(site, 'pv') ? c.pvInverterManufacturer || '' : '',
      'PV-Wechselrichter Modell / Serie': has(site, 'pv') ? c.pvInverterModel || '' : '',
      'Nutzung von PV-Strom in ihrem Gebäude?': has(site, 'pv') ? site.pvUsage || '' : '',
      'PV-Partner ': has(site, 'pv') ? formatPvOperator(site) : '',

      'Gibt es ein Gebäudeleittechnik (GLT)-System oder Energiemonitoring/managementsystem (EMS) in ihrem Gebäude?': emsAnswer,
    };
  });
}
