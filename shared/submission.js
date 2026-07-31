/**
 * Zentrale, serverseitig genutzte Logik beim Absenden:
 *  1. Validierung der Pflichtfelder
 *  2. Erzeugung der CSV (Standard- oder Sektorkopplungs-Format)
 *  3. Erzeugung der lesbaren E-Mail-Zusammenfassung (HTML)
 *
 * Diese Datei wird sowohl von der Cloudflare Pages Function
 * (functions/api/submit.js) als auch vom lokalen Dev-Mock (vite.config.js)
 * verwendet – damit ist garantiert, dass lokal und live dieselbe Prüfung läuft.
 */

import { buildStandardCsv, buildSektorkopplungCsv } from './csv.js';
import { describeConversion } from './conversion.js';
import { formatOtherHeatSources } from './sektorLabels.js';
import { siteHeatPumps, formatHeatPump } from './heatPumps.js';

function isFilled(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Validiert die Eingaben. Gibt eine Liste verständlicher Fehlertexte zurück. */
export function validateSubmission(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return ['Es wurden keine Daten übermittelt.'];
  }

  if (data.privacyConsent !== true) {
    errors.push('Bitte bestätigen Sie den Datenschutzhinweis.');
  }

  if (data.type === 'standard') {
    const p = data.project || {};
    if (!isFilled(p.contactName)) errors.push('Ansprechpartner (Name) fehlt.');
    if (!isFilled(p.company)) errors.push('Unternehmen fehlt.');
    if (!isFilled(p.contactEmail)) errors.push('E-Mail des Ansprechpartners fehlt.');
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.contactEmail)) errors.push('E-Mail des Ansprechpartners ist ungültig.');

    const systems = data.systems || [];
    if (systems.length === 0) errors.push('Es wurde keine Anlage erfasst.');
    systems.forEach((s, i) => {
      const n = i + 1;
      if (!isFilled(s.streetHeating)) errors.push(`Anlage ${n}: Straße & Hausnummer der Heizungsanlage fehlt.`);
      if (!isFilled(s.plz)) errors.push(`Anlage ${n}: PLZ fehlt.`);
      if (!isFilled(s.city)) errors.push(`Anlage ${n}: Stadt fehlt.`);
      if (!Array.isArray(s.heatingTypes) || s.heatingTypes.length === 0) errors.push(`Anlage ${n}: Heizungstyp fehlt.`);
      if (!isFilled(s.heatedAreaM2)) errors.push(`Anlage ${n}: Beheizte Fläche fehlt.`);
      if (!isFilled(s.consumptionLastYear)) errors.push(`Anlage ${n}: Jahresverbrauch (letztes Jahr) fehlt.`);
    });
  } else if (data.type === 'sektorkopplung') {
    const contact = data.contact || data; // rückwärtskompatibel
    if (!isFilled(contact.contactEmail)) errors.push('E-Mail des Ansprechpartners fehlt (für die Bestätigung).');
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.contactEmail)) errors.push('E-Mail des Ansprechpartners ist ungültig.');

    const sites = Array.isArray(data.sites) ? data.sites : [data];
    if (sites.length === 0) errors.push('Es wurde keine Anlage erfasst.');
    sites.forEach((s, i) => {
      const n = i + 1;
      if (!isFilled(s.streetHeating)) errors.push(`Anlage ${n}: Straße & Hausnummer der Heizungsanlage fehlt.`);
      if (!isFilled(s.plz)) errors.push(`Anlage ${n}: PLZ fehlt.`);
      if (!isFilled(s.city)) errors.push(`Anlage ${n}: Stadt fehlt.`);
      // Regler/Controller ist für die Anbindbarkeit entscheidend → Pflicht,
      // sobald eine Wärmepumpe erfasst ist – und zwar je Wärmepumpe, weil eine
      // Anlage mehrere verschiedene Wärmepumpen haben kann.
      if (Array.isArray(s.selectedComponents) && s.selectedComponents.includes('waermepumpe')) {
        const pumps = siteHeatPumps(s);
        if (!pumps.length) {
          errors.push(`Anlage ${n}: Regler / Controller der Wärmepumpe fehlt.`);
        } else {
          pumps.forEach((hp, j) => {
            if (isFilled(hp.controller)) return;
            errors.push(
              pumps.length > 1
                ? `Anlage ${n}: Regler / Controller der Wärmepumpe ${j + 1} fehlt.`
                : `Anlage ${n}: Regler / Controller der Wärmepumpe fehlt.`,
            );
          });
        }
      }
    });
  } else {
    errors.push('Unbekannter Formulartyp.');
  }

  return errors;
}

// Offizielles GreenFusion-Logo (White-Variante für dunklen Header).
const LOGO_WHITE =
  'https://raw.githubusercontent.com/dlizardo-pixel/Ressources-Greenfusion/main/GreenFusion-Logo-horizontal-white-RGB.svg';

const wrapHtml = (title, inner) => `
<div style="font-family:'Source Sans 3',Arial,sans-serif;color:#324B4A;max-width:680px;margin:0 auto;">
  <div style="background:#062726;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
    <img src="${LOGO_WHITE}" alt="GreenFusion" height="28" style="display:block;margin-bottom:12px;" />
    <h1 style="margin:0;font-size:20px;font-weight:600;">${esc(title)}</h1>
  </div>
  <div style="border:1px solid #E7FAF3;border-top:none;padding:20px 24px;border-radius:0 0 12px 12px;">
    ${inner}
  </div>
</div>`;

const kv = (label, value) =>
  isFilled(value)
    ? `<tr><td style="padding:4px 12px 4px 0;color:#6b8584;vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:4px 0;font-weight:600;">${esc(value)}</td></tr>`
    : '';

const section = (heading, rows) => {
  const body = rows.filter(Boolean).join('');
  if (!body) return '';
  return `<h2 style="font-size:15px;color:#062726;margin:20px 0 6px;border-bottom:2px solid #3AD99F;padding-bottom:4px;">${esc(heading)}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">${body}</table>`;
};

/**
 * Eine Zeile je Wärmepumpe der Anlage — eine Anlage kann mehrere verschiedene
 * Wärmepumpen haben. Der Status („läuft schon"/„geplant") gilt für die
 * Komponente insgesamt und steht deshalb nur in der ersten Zeile.
 */
function heatPumpRows(site, selected, status) {
  if (!selected) return [];
  const pumps = siteHeatPumps(site);
  if (!pumps.length) return [kv('Wärmepumpe', status)];
  return pumps.map((hp, i) =>
    kv(
      pumps.length > 1 ? `Wärmepumpe ${i + 1}` : 'Wärmepumpe',
      [i === 0 ? status : '', formatHeatPump(hp)].filter(Boolean).join(' · '),
    ),
  );
}

/** Lesbare Zusammenfassung für die E-Mail an den GF-Mitarbeiter. */
export function buildSummaryHtml(data) {
  if (data.type === 'standard') {
    const p = data.project || {};
    let html = section('Projekt / Ansprechpartner', [
      kv('Name', p.contactName),
      kv('Rolle / Funktion', p.contactRole),
      kv('Unternehmen', p.company),
      kv('E-Mail', p.contactEmail),
      kv('Anzahl Anlagen', p.systemCount),
      kv('Vorgabe Energieträger', p.defaultEnergyType),
    ]);

    (data.systems || []).forEach((s, i) => {
      const supply = s.multiSupply === true ? `Ja${isFilled(s.supplyCount) ? ` (${s.supplyCount})` : ''}` : s.multiSupply === false ? 'Nein' : '';
      const heating = [...(s.heatingTypes || []), s.heatingTypeOther].filter(Boolean).join(', ');
      html += section(`Anlage ${i + 1}: ${s.streetHeating || ''} ${s.plz || ''} ${s.city || ''}`.trim(), [
        kv('Heizungstyp', heating),
        kv('Mehrere Gebäude / Unterstationen', supply),
        kv('Fernwärme-Anschlussleistung', isFilled(s.districtHeatingConnectionKw) ? `${s.districtHeatingConnectionKw} kW` : ''),
        kv('Wohneinheiten', s.residentialUnits),
        kv('Beheizte Fläche', isFilled(s.heatedAreaM2) ? `${s.heatedAreaM2} m²` : ''),
        kv('Besonderheiten', s.specialNotes),
        kv('Verbrauch letztes Jahr', describeConversion(s.consumptionLastYear, s.heatingTypes)),
        kv('Verbrauch vorletztes Jahr', describeConversion(s.consumptionPrevYear, s.heatingTypes)),
        kv('Hauswart / Kontakt', s.caretakerContact),
        kv('Telefon', s.caretakerPhone),
        kv('Heizkreise', s.heatingCircuits),
        kv('Internet via Modem', s.internetModem === true ? 'Ja' : s.internetModem === false ? 'Nein' : ''),
        kv('Rechnungsanschrift', s.billingAddress),
        kv('E-Mail Rechnungsversand', s.billingEmail),
        kv('Weitere Empfänger', s.additionalRecipients),
        kv('Referenznummer', s.referenceNumber),
      ]);
    });

    return wrapHtml('Neue Anlagen-Erfassung (Standard Business Case)',
      `<p style="margin-top:0;">Es ist eine neue Erfassung über das Online-Formular eingegangen. Die vollständigen Daten finden Sie in der angehängten CSV-Datei.</p>${html}`);
  }

  // Sektorkopplung – Ansprechpartner einmal, dann pro Anlage.
  const contact = data.contact || data;
  const sites = Array.isArray(data.sites) ? data.sites : [data];

  let html = section('Ansprechpartner', [
    kv('Ansprechpartner', contact.contactName),
    kv('Unternehmen', contact.company),
    kv('E-Mail', contact.contactEmail),
    kv('Telefon', contact.contactPhone),
    kv('Anzahl Anlagen', sites.length),
  ]);

  sites.forEach((site, i) => {
    const c = site.components || {};
    const sel = Array.isArray(site.selectedComponents) ? site.selectedComponents : [];
    const compState = (key) => {
      if (!sel.includes(key)) return '';
      const st = (site.componentStatus || {})[key];
      return st === 'geplant' ? 'geplant' : st === 'vorhanden' ? 'läuft schon' : 'ausgewählt';
    };
    const pvOperator = site.pvOperator
      ? site.pvOperator.startsWith('Ein Dritter') && site.pvOperatorName
        ? `${site.pvOperator} – ${site.pvOperatorName}`
        : site.pvOperator
      : '';

    html += section(`Anlage ${i + 1}: ${site.streetHeating || ''} ${site.plz || ''} ${site.city || ''}`.trim(), [
      kv('Versorgte Gebäude', site.suppliedBuildings),
      kv('Wohneinheiten', site.residentialUnits),
      kv('Einsparberechnung gewünscht', site.calcSavings === true ? 'Ja' : site.calcSavings === false ? 'Nein' : ''),
      kv('Jährl. Wärmebedarf', site.calcSavings === true && isFilled(site.annualHeatDemandKwh) ? `${site.annualHeatDemandKwh} kWh` : ''),
      kv('Mieterstromteilnehmer', site.calcSavings === true ? site.tenantPowerParticipants : ''),
      kv('Strompreis Wärmepumpe / Reststrom', site.calcSavings === true && isFilled(site.electricityPriceEurKwh) ? `${site.electricityPriceEurKwh} €/kWh` : ''),
      ...heatPumpRows(site, sel.includes('waermepumpe'), compState('waermepumpe')),
      kv('WP ist Haupterzeuger', sel.includes('waermepumpe') ? (site.wpIsMainHeater === true ? 'Ja' : site.wpIsMainHeater === false ? 'Nein' : '') : ''),
      kv('Weitere Wärmeerzeuger', formatOtherHeatSources(site)),
      kv('Heizstab', compState('heizstab') && `${compState('heizstab')} · ${[c.heatingRodCount && `${c.heatingRodCount}×`, c.heatingRodKw && `${c.heatingRodKw} kW`].filter(Boolean).join(', ')}`),
      kv('Pufferspeicher', compState('pufferspeicher') && `${compState('pufferspeicher')} · ${[c.bufferCount && `${c.bufferCount}×`, c.bufferLiters && `${c.bufferLiters} l`].filter(Boolean).join(', ')}`),
      kv('PV-Anlage', compState('pv') && `${compState('pv')} · ${[c.pvInverterManufacturer, c.pvInverterModel, c.pvKwp && `${c.pvKwp} kWp`].filter(Boolean).join(', ')}`),
      kv('PV-Nutzung', sel.includes('pv') ? site.pvUsage : ''),
      kv('PV-Betreiber', sel.includes('pv') ? pvOperator : ''),
      kv('Batteriespeicher', compState('batterie') && `${compState('batterie')} · ${[c.batteryInverterModel, c.batteryCount && `${c.batteryCount}×`, c.batteryKwh && `${c.batteryKwh} kWh`].filter(Boolean).join(', ')}`),
      kv('Anderes EMS / GLT', site.existingEms === true ? 'Ja' : site.existingEms === false ? 'Nein' : ''),
      kv('EMS nutzt Modbus', site.existingEms === true ? site.existingEmsModbus : ''),
      kv('Zeithorizont (Planung)', site.planningHorizon),
      kv('Kommentar', site.comment),
    ]);
  });

  return wrapHtml('Neue Anlagen-Erfassung (Sektorkopplung)',
    `<p style="margin-top:0;">Es ist eine neue Sektorkopplungs-Erfassung über das Online-Formular eingegangen. Die vollständigen Daten finden Sie in der angehängten CSV-Datei.</p>${html}`);
}

/** Freundliche Bestätigungs-E-Mail an den Kunden. */
export function buildConfirmationHtml(name) {
  const greeting = isFilled(name) ? `Hallo ${esc(name)},` : 'Hallo,';
  return wrapHtml('Alles angekommen — danke.', `
    <p>${greeting}</p>
    <p>Ihre Angaben sind bei uns angekommen. Wir rechnen jetzt durch, was Ihre Anlagen sparen können,
       und melden uns dann bei Ihnen.</p>
    <p>Kein Verkaufsgespräch — erstmal nur die Zahlen. Wenn vorher etwas unklar ist oder Sie etwas
       nachreichen möchten, antworten Sie einfach auf diese Mail.</p>
    <p style="margin-top:24px;">Viele Grüße<br/>Ihr Team von Green Fusion</p>
    <p style="font-size:12px;color:#6b8584;margin-top:24px;">
      Diese Mail kam automatisch. Ihre Daten nutzen wir nur, um Ihre mögliche Ersparnis zu berechnen.
    </p>
  `);
}

/** Wählt den Kunden-Namen + E-Mail je nach Formulartyp aus. */
function customerContact(data) {
  if (data.type === 'standard') {
    return { name: data.project?.contactName, email: data.project?.contactEmail };
  }
  const contact = data.contact || data; // sektorkopplung (rückwärtskompatibel)
  return { name: contact.contactName, email: contact.contactEmail };
}

/**
 * Bündelt alles, was beim Absenden gebraucht wird.
 * Wird von Function und Dev-Mock gemeinsam genutzt.
 */
export function buildSubmission(data) {
  const errors = validateSubmission(data);
  if (errors.length) {
    return { valid: false, errors };
  }

  const isStandard = data.type === 'standard';
  const csv = isStandard ? buildStandardCsv(data) : buildSektorkopplungCsv(data);
  const stamp = new Date().toISOString().slice(0, 10);
  const csvFilename = isStandard
    ? `GF-Anlagenliste_Standard_${stamp}.csv`
    : `GF-Anlagenliste_Sektorkopplung_${stamp}.csv`;

  const { name, email } = customerContact(data);

  return {
    valid: true,
    errors: [],
    csv,
    csvFilename,
    summaryHtml: buildSummaryHtml(data),
    confirmationHtml: buildConfirmationHtml(name),
    customerName: name,
    customerEmail: email,
    type: data.type,
  };
}
