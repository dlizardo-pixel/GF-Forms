---
name: kickscale-link
description: Erzeugt aus Kickscale-Deal-Notizen/-Transcripts (.md-Dateien) einen vorausgefüllten Formular-Link über die Integrations-API. Verwenden, wenn der Nutzer sagt "erstell einen Formular-Link für <Firma/Deal>" oder Meeting-Daten in einen Erfassungslink verwandeln will.
---

# Kickscale → vorausgefüllter Formular-Link

Ziel: Aus den `.md`-Dateien eines Deal-Ordners (Deal-Infos, Meeting-Transcripts)
die bekannten Daten extrahieren, per API einen kurzen Prefill-Link erzeugen und
dem Nutzer geben. Referenz: `docs/API.md`.

## Schritte

1. **Deal-Ordner finden.** Der Nutzer nennt Firma oder Ordner. Wenn der Pfad
   unklar ist, nachfragen. Alle `.md`-Dateien des Deals lesen.

2. **Daten extrahieren — nur, was klar belegt ist. Nichts erfinden.**
   - Ansprechpartner: `contactName`, `contactRole`, `company`, `contactEmail`
   - Pro Anlage/Adresse: `streetHeating` (Straße + Hausnr.), `plz`, `city`,
     `heatingTypes`, `residentialUnits` (Wohneinheiten), `heatedAreaM2`,
     `consumptionLastYear`, `specialNotes`
   - Vage Aussagen ("ungefähr 20 Gebäude", "irgendwas mit Gas") NICHT in
     Zahlen-/Auswahlfelder schreiben — stattdessen in `specialNotes` notieren
     oder weglassen. Der Kunde ergänzt fehlende Felder selbst.

3. **Heizungsbegriffe auf die gültigen Werte mappen** (exakte Schreibweise):
   `Gas zentral`, `Gaskombi`, `Hybridanlage (Gas + WP)`, `Wärmepumpe`,
   `Fernwärme`, `BHKW`, `Öl`, `Holz-Pellets`, `Nachtspeicher / Elektro`,
   `Was anderes / weiß nicht` (+ `heatingTypeOther` Freitext).

   | Im Transcript … | → heatingTypes |
   | --- | --- |
   | Gasetagenheizung, Gastherme pro Wohnung, dezentral Gas | `Gaskombi` |
   | Gaskessel, zentrale Gastherme, Gas-Zentralheizung | `Gas zentral` |
   | Blockheizkraftwerk, KWK | `BHKW` |
   | Pelletheizung, Holzheizung | `Holz-Pellets` |
   | Nachtspeicheröfen, Elektroheizung | `Nachtspeicher / Elektro` |
   | Gas + Wärmepumpe kombiniert | `Hybridanlage (Gas + WP)` |
   | unklar / nicht erwähnt | `[]` (leer lassen!) |

4. **Formulartyp wählen:** Standard (`type: "standard"`, payload
   `{project, systems}`) für klassische Heizungserfassung. Nur wenn es explizit
   um Wärmepumpen-/PV-Bestandsanlagen für Sektorkopplung geht:
   `type: "sektorkopplung"` (payload `{contact, sites}`).

5. **API aufrufen:**
   ```bash
   curl -X POST "https://<domain>/api/v1/prefill-link" \
     -H "Authorization: Bearer $PREFILL_API_TOKEN" \
     -H "Content-Type: application/json" \
     -d '<JSON wie in docs/API.md>'
   ```
   Token: Umgebungsvariable `PREFILL_API_TOKEN`; wenn nicht gesetzt, beim
   Nutzer erfragen. Domain: die Pages-URL des Projekts (beim Nutzer erfragen,
   falls unbekannt). Lokal (`npm run dev`): `http://localhost:5173`, beliebiger
   nicht-leerer Token.

6. **Ergebnis präsentieren:** den `url`-Link aus der Antwort + kurze Übersicht:
   welche Felder wurden vorausgefüllt (Firma, Kontakt, N Anlagen mit Adressen …)
   und was der Kunde noch ergänzen muss (typisch: Heizungstyp, Verbrauch).
   Bei `401/503`: Hinweis, dass `PREFILL_API_TOKEN` in Cloudflare gesetzt sein
   muss (siehe docs/API.md, Abschnitt 1).
