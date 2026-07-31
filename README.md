# Green Fusion · Anlagen-Erfassungsformular

Zwei geführte Online-Formulare im Typeform-Stil, mit denen Kundinnen und Kunden
ihre Heizungsanlagen erfassen. Beim Absenden erstellt die Anwendung **server­seitig**
eine CSV im Format der bestehenden GF-Anlagenliste und verschickt **zwei E-Mails**
(an Green Fusion mit CSV-Anhang sowie eine Bestätigung an den Kunden) – ganz ohne
Download oder manuelles Anhängen.

- **Oberfläche:** React + Vite (komplett auf Deutsch)
- **Server-Teil:** Cloudflare Pages Function (`/api/submit`)
- **E-Mail-Versand:** Brevo (EU-betrieben)
- **Datenbank:** Cloudflare D1 (EU) für automatisches Cloud-Zwischenspeichern und
  eine Admin-Übersicht (Abschnitt 6b). Ohne D1-Bindung läuft alles weiter, nur
  ohne Cloud-Speicherung.

> **Wichtig:** Es ist **keine** rein statische Seite. Der E-Mail-Versand läuft in
> einer serverseitigen Funktion. Der Brevo-Schlüssel und die Empfängeradresse
> stehen **nie im Code**, sondern als **Umgebungsvariablen** in Cloudflare.

---

## Inhalt

1. [Schnellstart: lokal ausprobieren](#1-schnellstart-lokal-ausprobieren)
2. [Vollständiger lokaler Test inkl. echter E-Mails](#2-vollständiger-lokaler-test-inkl-echter-e-mails)
3. [Code zu GitHub bringen](#3-code-zu-github-bringen)
4. [Mit Cloudflare Pages verbinden](#4-mit-cloudflare-pages-verbinden)
5. [Umgebungsvariablen in Cloudflare setzen](#5-umgebungsvariablen-in-cloudflare-setzen)
6. [⭐ Absender-Domain bei Brevo per SPF/DKIM freischalten (ausführlich)](#6--absender-domain-bei-brevo-per-spfdkim-freischalten-ausführlich)
7. [Projektstruktur](#7-projektstruktur)
8. [Anpassen & Erweitern](#8-anpassen--erweitern)

---

## 1. Schnellstart: lokal ausprobieren

Voraussetzung: **Node.js** ab Version 18 (besser 20+). Prüfen mit `node --version`.

```bash
npm install      # einmalig: Abhängigkeiten laden
npm run dev      # Entwicklungsserver starten
```

Es erscheint eine Adresse wie `http://localhost:5173`. Dort öffnet sich die
Startseite mit der Typ-Auswahl. Sie können beide Formulare komplett durchklicken
und auf **Absenden** gehen.

**Im `npm run dev`-Modus wird KEINE echte E-Mail verschickt.** Stattdessen prüft
ein eingebauter „Mock" die Pflichtfelder und erzeugt die CSV. Den CSV-Inhalt
sehen Sie im Terminal (dort, wo `npm run dev` läuft). So lässt sich der ganze
Ablauf mit Testwerten gefahrlos ausprobieren.

---

## 2. Vollständiger lokaler Test inkl. echter E-Mails

Wenn Sie den **echten** Versand über Brevo lokal testen möchten, brauchen Sie die
Cloudflare-Werkzeuge (Wrangler, ist bereits als Abhängigkeit enthalten):

1. Kopieren Sie die Vorlage für lokale Secrets:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
2. Tragen Sie in `.dev.vars` Ihre Werte ein (Brevo-Schlüssel, Empfänger, Absender).
   - Lassen Sie `BREVO_API_KEY` **leer**, bleibt es beim Mock-Modus (kein echter Versand).
   - Die Datei `.dev.vars` wird **nicht** eingecheckt (steht in `.gitignore`).
3. App bauen und mit der Funktion lokal starten:
   ```bash
   npm run build
   npm run pages:dev
   ```
   Wrangler serviert nun die App **inklusive** der Funktion `/api/submit` (Adresse
   wird im Terminal angezeigt, meist `http://localhost:8788`).

> Tipp: Für reines Oberflächen-Design ist `npm run dev` bequemer (sofortige
> Aktualisierung). Für den End-zu-End-Test des Versands nutzen Sie `npm run pages:dev`.

---

## 3. Code zu GitHub bringen

Ziel: Der gesamte Code liegt in einem GitHub-Repository. Cloudflare veröffentlicht
dann bei **jeder Änderung** automatisch.

1. **GitHub-Konto** anlegen (falls noch nicht vorhanden): <https://github.com>.
2. Auf GitHub oben rechts **„+" → „New repository"** wählen.
   - Name z. B. `gf-forms`.
   - **Private** auswählen (empfohlen).
   - **Ohne** README/`.gitignore` anlegen (die liegen schon im Projekt).
   - **„Create repository"** klicken.
3. GitHub zeigt nun Befehle an. Falls der Code noch nicht in Git liegt, im
   Projektordner ausführen (Adresse durch die von GitHub angezeigte ersetzen):
   ```bash
   git init
   git add .
   git commit -m "Erste Version Anlagen-Erfassungsformular"
   git branch -M main
   git remote add origin https://github.com/IHR-KONTO/gf-forms.git
   git push -u origin main
   ```
   > Hinweis: Ist das Projekt bereits ein Git-Repository, genügen
   > `git add . && git commit -m "…" && git push`.

Nach dem Push sehen Sie alle Dateien auf der GitHub-Seite des Repositorys.

---

## 4. Mit Cloudflare Pages verbinden

1. **Cloudflare-Konto** anlegen/anmelden: <https://dash.cloudflare.com>.
2. Links im Menü **„Workers & Pages"** → **„Create application"** → Reiter
   **„Pages"** → **„Connect to Git"**.
3. GitHub autorisieren und das Repository **`gf-forms`** auswählen.
4. **Build-Einstellungen** (sehr wichtig – genau so eintragen):

   | Feld | Wert |
   |---|---|
   | **Framework preset** | `Vite` (oder „None") |
   | **Build command** | `npm run build` |
   | **Build output directory** | `dist` |

   Den Ordner `functions/` erkennt Cloudflare Pages automatisch – daraus wird der
   Endpunkt `/api/submit`. Es ist **keine** zusätzliche Einstellung nötig.
5. **„Save and Deploy"** klicken. Cloudflare baut die App und vergibt eine Adresse
   wie `https://gf-forms.pages.dev`.

Ab jetzt gilt: **jeder `git push` auf `main` veröffentlicht automatisch** eine
neue Version.

> **Bevor der Versand funktioniert, müssen noch die Umgebungsvariablen gesetzt
> (Abschnitt 5) und die Absender-Domain bei Brevo freigeschaltet werden
> (Abschnitt 6).** Ohne `BREVO_API_KEY` läuft die Live-Seite im Mock-Modus und
> verschickt nichts.

---

## 5. Umgebungsvariablen in Cloudflare setzen

Im Cloudflare-Dashboard: **Workers & Pages → Ihr Projekt → Settings →
Environment variables → „Add variable"**. Legen Sie diese vier Variablen an
(für **Production**; bei Bedarf zusätzlich für **Preview**):

| Name | Beispielwert | Hinweis |
|---|---|---|
| `BREVO_API_KEY` | `xkeysib-…` | **Als „Secret" / „Encrypt" markieren!** Aus Brevo (siehe unten). |
| `GF_RECIPIENT_EMAIL` | `anfragen@green-fusion.de` | Wer die Zusammenfassung + CSV erhält. |
| `BREVO_SENDER_EMAIL` | `noreply@green-fusion.de` | Verifizierte Absenderadresse (Abschnitt 6). |
| `BREVO_SENDER_NAME` | `Green Fusion` | Anzeigename des Absenders (optional). |
| `ADMIN_PASSWORD` | `langes-zufälliges-passwort` | **Als „Secret" markieren.** Passwort für die Admin-Übersicht `/admin`. Ohne dieses Passwort ist der Admin-Bereich deaktiviert. |
| `PREFILL_API_TOKEN` | `langer-zufälliger-token` | **Als „Secret" markieren.** Optional: schaltet die Integrations-API frei (Abschnitt 6c / `docs/API.md`). Ohne Token ist die API deaktiviert. |

**Den Brevo-API-Schlüssel erstellen:**
1. Bei Brevo anmelden: <https://app.brevo.com>.
2. Oben rechts auf den Kontonamen → **„SMTP & API"** → Reiter **„API Keys"**.
3. **„Generate a new API key"**, Namen vergeben (z. B. „GF-Forms"), Schlüssel
   **sofort kopieren** (er wird nur einmal angezeigt) und in Cloudflare als
   `BREVO_API_KEY` einfügen.

> Nach dem Ändern von Variablen ein **erneutes Deployment** auslösen
> (Cloudflare: „Retry deployment", oder einen kleinen `git push`), damit die
> Werte aktiv werden.

---

## 6. ⭐ Absender-Domain bei Brevo per SPF/DKIM freischalten (ausführlich)

**Das ist erfahrungsgemäß der einzige Punkt, an dem man als Nicht-Entwickler
hängenbleibt.** Bitte hier in Ruhe vorgehen.

### Warum ist das nötig?

Brevo verschickt E-Mails **in Ihrem Namen** (z. B. von `noreply@green-fusion.de`).
Damit E-Mail-Anbieter (Gmail, Outlook usw.) diese Mails **nicht als Spam**
einstufen oder ganz ablehnen, müssen Sie Brevo per Eintrag in Ihrer Domain
**ausdrücklich erlauben**, in Ihrem Namen zu senden. Das geschieht über zwei
technische Nachweise:

- **SPF** sagt: „Dieser Server (Brevo) darf für meine Domain senden."
- **DKIM** versieht jede Mail mit einer **digitalen Signatur**, die beweist, dass
  sie wirklich autorisiert ist und unterwegs nicht verändert wurde.

Praktisch heißt das: Sie fügen ein paar **DNS-Einträge** bei dem Anbieter hinzu,
bei dem Ihre Domain `green-fusion.de` verwaltet wird (z. B. IONOS, Strato, GoDaddy,
Cloudflare DNS, …). Ein DNS-Eintrag ist wie ein Telefonbuch-Eintrag für Ihre
Domain – Sie tragen dort einen kleinen Text ein.

### Schritt für Schritt

1. **Domain bei Brevo hinzufügen**
   - In Brevo: oben rechts Kontoname → **„Senders, Domains & Dedicated IPs"** →
     Reiter **„Domains"** → **„Add a domain"**.
   - Domain eingeben, z. B. `green-fusion.de`, und bestätigen.

2. **Brevo zeigt Ihnen mehrere DNS-Einträge an** (Typ `TXT` und/oder `CNAME`).
   Typisch sind:
   - ein **DKIM**-Eintrag (oft `mail._domainkey…` als `TXT` oder `CNAME`),
   - ein **SPF**-Eintrag (ein `TXT`-Eintrag, der `include:spf.brevo.com` enthält),
   - manchmal ein **DMARC**-Eintrag (`_dmarc` als `TXT`) und ein
     **Brevo-Code** zur Bestätigung der Domain.

   Lassen Sie dieses Brevo-Fenster geöffnet – Sie kopieren die Werte gleich.

3. **DNS-Einträge bei Ihrem Domain-Anbieter eintragen**
   - Melden Sie sich beim Verwalter Ihrer Domain an (dort, wo Sie `green-fusion.de`
     gekauft haben) und öffnen Sie den Bereich **„DNS"** / „DNS-Verwaltung" /
     „Nameserver-Einstellungen".
   - Legen Sie **für jeden** von Brevo angezeigten Eintrag einen neuen DNS-Eintrag an:
     - **Typ** exakt übernehmen (`TXT` bzw. `CNAME`).
     - **Name/Host:** den von Brevo angezeigten Namen eintragen (z. B.
       `mail._domainkey`). Manche Anbieter wollen den Namen **ohne** die eigene
       Domain (also nur `mail._domainkey`), andere mit – im Zweifel die
       Anbieter-Hilfe lesen. Für die Hauptdomain wird oft `@` verwendet.
     - **Wert/Ziel:** den von Brevo angezeigten Wert **1:1 kopieren** (keine
       Leerzeichen, nichts kürzen).

   > **Wichtig zu SPF:** Pro Domain darf es **nur einen** SPF-Eintrag geben.
   > Existiert schon einer (beginnt mit `v=spf1 …`), dann **nicht** einen zweiten
   > anlegen, sondern den bestehenden ergänzen, indem Sie `include:spf.brevo.com`
   > vor dem abschließenden `~all` einfügen. Beispiel:
   > `v=spf1 include:_spf.google.com include:spf.brevo.com ~all`

4. **Warten und prüfen**
   - DNS-Änderungen brauchen oft **einige Minuten bis zu 24 Stunden**, bis sie
     überall sichtbar sind.
   - Zurück in Brevo auf **„Verify" / „Authenticate"** klicken. Sobald alle Haken
     **grün** sind, ist die Domain freigeschaltet.

5. **Absenderadresse muss zur Domain passen**
   - Die in Cloudflare gesetzte `BREVO_SENDER_EMAIL` (z. B. `noreply@green-fusion.de`)
     muss zur **freigeschalteten Domain** gehören. Eine `@gmail.com`-Adresse
     funktioniert hier **nicht** als Absender.

### Häufige Stolpersteine

- **Mails landen im Spam / kommen nicht an:** Domain in Brevo noch nicht „grün"
  verifiziert, oder `BREVO_SENDER_EMAIL` gehört nicht zur verifizierten Domain.
- **„DKIM not found":** Name/Host des Eintrags falsch (Domain doppelt angehängt
  oder weggelassen). Anbieter-Hilfe zum Format prüfen.
- **Zwei SPF-Einträge:** führt zu Fehlern – es darf nur **einer** existieren.
- **Wert abgeschnitten:** lange `TXT`-Werte vollständig und ohne Zeilenumbruch
  einfügen.

---

## 6b. Cloud-Zwischenspeicherung & Admin-Übersicht (Cloudflare D1)

Die Anwendung speichert Eingaben **automatisch in der Cloud** (zusätzlich zum
Browser), damit nichts verloren geht – auch wenn jemand nicht absendet oder den
Zugang verliert. Green Fusion sieht alle Entwürfe **und** Einreichungen in einer
**passwortgeschützten Übersicht** unter `/admin`. Pro Eintrag lässt sich dort:

- die **CSV herunterladen**,
- ein **Öffnen-Link** erzeugen (öffnet das Formular mit allen bereits erfassten
  Daten – zum erneuten Ansehen oder zum Weiterbearbeiten durch den Kunden; gleiches
  Verfahren wie die vorausgefüllten Links),
- der Eintrag in den **Papierkorb** legen und dort **wiederherstellen** oder
  **endgültig löschen**.

> Die Papierkorb-Spalte (`deleted_at`) wird bei bestehenden Datenbanken automatisch
> ergänzt – es ist kein manuelles Migrations-Skript nötig.

### Datenbank einrichten (einmalig)

Voraussetzung: Wrangler ist installiert (ist als Abhängigkeit dabei → `npx wrangler …`).

1. **Anmelden:** `npx wrangler login`
2. **Datenbank anlegen:** `npx wrangler d1 create gf-forms-db`
   → Wrangler zeigt eine `database_id`. Diese in **`wrangler.toml`** bei
   `database_id` eintragen (ersetzt `REPLACE_WITH_YOUR_DATABASE_ID`).
   - Für **EU-Datenhaltung** beim Anlegen die passende Region wählen
     (z. B. `--location weur` für Westeuropa).
3. **Tabellen anlegen** (Schema einspielen):
   ```bash
   npx wrangler d1 execute gf-forms-db --remote --file=./schema.sql
   ```
   > Das Schema ist idempotent (`CREATE TABLE IF NOT EXISTS`). Nach Updates – z. B.
   > der neuen Tabelle `prefills` für vorausgefüllte Links – einfach erneut
   > ausführen; bestehende Daten bleiben erhalten.
4. **Bindung in Cloudflare Pages setzen:** Projekt → **Settings → Functions →
   D1 database bindings** → Variablenname **`DB`** mit der Datenbank `gf-forms-db`
   verknüpfen (für Production und ggf. Preview).
5. **Admin-Passwort setzen:** Umgebungsvariable **`ADMIN_PASSWORD`** als Secret
   anlegen (Abschnitt 5). Ohne dieses Passwort ist `/admin` deaktiviert.
6. **Neu deployen.** Danach ist `https://…/admin` erreichbar (Passwort eingeben).

### Datenschutz / Compliance

- **Aufbewahrung:** Einträge werden **30 Tage** nach der letzten Änderung
  automatisch gelöscht (Wert: `RETENTION_DAYS` in `functions/_lib/store.js`).
  Die Löschung läuft „beiläufig" bei jeder Speicher-/Listenaktion, da Cloudflare
  Pages keine zeitgesteuerten Jobs bietet.
- **Region:** D1 lässt sich in der **EU** anlegen (siehe oben) – anders als
  Cloudflare KV, das global repliziert. Deshalb D1.
- **Hinweis im Formular:** Kundinnen/Kunden werden im Formular darauf
  hingewiesen, dass Eingaben zwischengespeichert und nach 30 Tagen gelöscht werden.
- **Verantwortung:** Rechtsgrundlage (z. B. berechtigtes Interesse/Einwilligung)
  und der Auftragsverarbeitungsvertrag (AVV) mit Cloudflare liegen bei Green
  Fusion. Dies ist keine Code-Aufgabe – bitte mit dem Datenschutz abstimmen.
- **Zugang:** `/admin` ist nur mit `ADMIN_PASSWORD` nutzbar (über HTTPS). Bitte
  ein langes, zufälliges Passwort verwenden.

> **Ohne D1-Bindung** funktioniert alles weiter – es wird dann nur nicht in der
> Cloud gespeichert (kein Fehler). Bei reinem `npm run dev` simuliert ein
> In-Memory-Speicher die Cloud, und `/admin` akzeptiert jedes Passwort (nur lokal).

### Keine E-Mail erhalten, obwohl eingereicht wurde?

Jede Einreichung zeigt in `/admin` ihren **Mail-Status**: Ist etwas schiefgelaufen,
steht am Eintrag ein roter Hinweis **„⚠ Mail nicht verschickt"** (Details im
Eintrag; die CSV lässt sich dort herunterladen und manuell weiterleiten).
Checkliste zur Ursache:

1. **Cloudflare** → Projekt → **Settings → Variables and secrets**, Umgebung
   **Production**: Sind `BREVO_API_KEY`, `GF_RECIPIENT_EMAIL` und
   `BREVO_SENDER_EMAIL` gesetzt? Fehlt der API-Key, läuft das Absenden im
   „Mock-Modus" — Einreichung wird gespeichert, aber **keine** Mail verschickt.
   (Häufigster Fehler: Variablen nur für „Preview" statt „Production" angelegt.)
2. **Brevo** → **Transactional → Logs**: Wurde die Mail verschickt oder
   abgelehnt (z. B. Absender nicht verifiziert)?
3. **Spam-Ordner** des Empfänger-Postfachs prüfen.

---

## 6c. Integrations-API (Formulare mit anderen Tools verbinden)

Externe Tools (Scripts, Claude, CRM …) können per API einen **vorausgefüllten
Formular-Link** erzeugen — z. B. um aus Meeting-Transcripts (Kickscale)
automatisch Erfassungslinks zu bauen:

```
POST /api/v1/prefill-link          (Authorization: Bearer <PREFILL_API_TOKEN>)
{ "type": "standard", "payload": { "project": {…}, "systems": [{…}] } }
→ { "ok": true, "url": "https://…/standard?p=abc123" }
```

- Freischalten: Secret **`PREFILL_API_TOKEN`** in Cloudflare setzen
  (Abschnitt 5). Ohne Token ist die API deaktiviert.
- Vollständige Doku mit Feldreferenz und Beispielen: **[`docs/API.md`](docs/API.md)**.
- Für den Kickscale-Workflow gibt es ein Claude-Skill:
  `.claude/skills/kickscale-link/` („erstell einen Formular-Link für Firma X").

## 7. Projektstruktur

```
GF-Forms/
├── index.html                 HTML-Einstieg (lädt Schriftart Source Sans 3)
├── package.json               Skripte & Abhängigkeiten
├── vite.config.js             Vite-Konfiguration + lokaler Mock für /api/submit
├── .dev.vars.example          Vorlage für lokale Secrets (kopieren → .dev.vars)
│
├── public/
│   ├── favicon.svg
│   └── _redirects             SPA-Fallback für Cloudflare Pages
│
├── schema.sql                 D1-Datenbankschema (Tabelle `entries`)
├── wrangler.toml              D1-Bindung (lokal/Prod) – database_id eintragen
│
├── functions/
│   ├── _lib/
│   │   ├── store.js           D1-Zugriff + Auto-Löschung (Aufbewahrung)
│   │   └── admin.js           Admin-Schutz (ADMIN_PASSWORD)
│   └── api/
│       ├── submit.js          ⭐ Validierung + Brevo-Versand + D1 (eingereicht)
│       ├── draft.js           Cloud-Zwischenspeichern (Entwürfe)
│       ├── v1/
│       │   └── prefill-link.js Integrations-API: Prefill-Link erzeugen (docs/API.md)
│       └── admin/
│           ├── entries.js     Liste für die Admin-Übersicht (+ Papierkorb)
│           ├── entry.js       Einzeleintrag + CSV-Download
│           ├── prefill.js     Vorausgefüllte/Öffnen-Links anlegen
│           └── trash.js       Papierkorb: löschen / wiederherstellen / endgültig löschen
│
├── shared/                    Von Oberfläche UND Server gemeinsam genutzte Logik
│   ├── conversion.js          Verbrauchs-Umrechnung in kWh (dokumentierte Faktoren)
│   ├── csv.js                 CSV-Erzeugung (Standard- und Sektorkopplungs-Format)
│   ├── manufacturers.js       Hersteller-Vorschlagslisten
│   └── submission.js          Validierung + CSV + E-Mail-Zusammenfassung (Kernlogik)
│
└── src/
    ├── main.jsx / App.jsx     Einstieg & Routing
    ├── index.css              Green Fusion Design System v2 (CSS-Variablen)
    ├── lib/                   Hilfsfunktionen (PLZ-Suche, Plausibilität, Prefill, Import, Cloud-Sync)
    ├── components/            Wiederverwendbare Felder, Layout, Import-Dialog, Mail-Pop-up
    └── routes/                Start, Formular 1, Formular 2, Dankeseite, Admin-Übersicht
```

### Was beim Absenden passiert (Kurzfassung)

1. Die Oberfläche schickt die Daten an `POST /api/submit`.
2. Die Pages Function (`functions/api/submit.js`) **prüft die Pflichtfelder**,
   **erzeugt die CSV** und verschickt über Brevo **zwei E-Mails**:
   eine an `GF_RECIPIENT_EMAIL` (mit Zusammenfassung **und CSV-Anhang**) und eine
   Bestätigung an den Kunden.
3. Der Kunde sieht die **Dankeseite**. Er lädt nichts herunter und hängt nichts an.

---

## 8. Anpassen & Erweitern

- **Umrechnungsfaktoren** (z. B. genauere Brennwerte): `shared/conversion.js`.
- **CSV-Spalten**: `shared/csv.js` (an die bestehende GF-Anlagenliste angelehnt).
- **Auswahloptionen** (Heizungstypen, Komponenten, WP-Topologie, PV-Nutzung,
  EMS/Zugriff …): `src/lib/options.js`.
- **Sektorkopplung – mehrere Anlagen:** Ansprechpartner einmal, dann je Anlage
  ein geführter Schritt (`src/routes/SektorkopplungForm.jsx` + `src/components/sektor/SiteEditor.jsx`,
  Datenmodell `src/lib/sektorModel.js`). Erfasst die anbindungsrelevanten Felder
  (WP-Regler/Controller, Topologie, Haupterzeuger, weitere Wärmeerzeuger, anderes
  EMS/GLT + Modbus, PV-Nutzung Eigenverbrauch/Volleinspeisung, PV-Betreiber,
  Zugriff/Erlaubnis, Zeithorizont). CSV-/E-Mail-Spalten dazu in `shared/csv.js`
  und `shared/submission.js`, Beschriftungen in `shared/sektorLabels.js`.
- **Sektorkopplung – mehrere Wärmepumpen je Anlage:** Eine Anlage kann
  verschiedene Wärmepumpen haben (anderes Modell, anderer Regler, andere Größe).
  Sie stehen als Liste in `site.heatPumps` (`{ manufacturer, model, controller,
  count, kw, topology }`); gleiche Geräte fasst `count` zusammen. Hersteller,
  Modell/Typ und Regler sind bewusst drei Felder — in Bestandslisten stehen
  meist nur Hersteller und Modell, während der Regler über die Anbindbarkeit
  entscheidet. Wer ihn nicht kennt, wählt „Regler kenne ich nicht"
  (`CONTROLLER_UNKNOWN`), damit das Absenden nicht blockiert. Gemeinsame Logik in
  `shared/heatPumps.js` (auch die Übernahme alter Entwürfe/Prefill-Links mit
  genau einer Wärmepumpe in `components.heatPump*`). In der CSV enthalten die
  WP-Spalten alle Einträge mit `" | "` getrennt (das i-te Teilstück gehört in
  jeder Spalte zur i-ten Wärmepumpe), die E-Mail listet eine Zeile je
  Wärmepumpe.
- **„Ich möchte beides"** (Startseite): füllt erst das klassische Formular aus
  (`/standard?both=1`), reicht den Kontakt per `sessionStorage` weiter und
  wechselt danach zu `/sektorkopplung?both=1` (zwei getrennte Einreichungen).
- **Hersteller-Vorschläge**: `shared/manufacturers.js`.
- **Design-Farben/Schrift/Icons**: `src/index.css` (Tokens) und `src/lib/brandAssets.js`.
- **Texte in Kundensprache**: direkt in den Seiten unter `src/routes/` und in den
  Feld-Komponenten (`src/components/standard/`).
- **Verhalten / Schwellen**: `src/lib/config.js`
  - `GUIDED_MAX` – bis zu wie vielen Anlagen der geführte Fluss läuft (Standard: 3);
    darüber die Tabelle.
  - `PORTFOLIO_HINT_FROM` – ab wie vielen Anlagen der „Liste per Mail schicken"-
    Hinweis erscheint (Standard: 15).
  - `GF_CONTACT_EMAIL` – Empfänger dieses „Notausgang"-Knopfes. Per Build-Variable
    `VITE_GF_CONTACT_EMAIL` überschreibbar (kein Secret, da clientseitig sichtbar).

### Weniger Abbrüche – was eingebaut ist

- **Tabelle als Hauptmodus** ab 4 Anlagen (wie die gewohnte Excel-Liste), mit
  Zeile duplizieren / „Werte von oben übernehmen", Zeilen hinzufügen/löschen und
  aufklappbarer Detailzeile für seltene Felder.
- **Liste importieren (Excel/CSV)**: Datei hochladen (.xlsx oder .csv) oder
  Tabelle einfügen. Die Spalten werden **automatisch erkannt** (auch bei anderer
  Reihenfolge/Benennung), deutsche Zahlenformate (`1.200,5`) bereinigt und
  Heizungs-Begriffe (`Erdgas`, `fw`, …) zugeordnet. Vor dem Übernehmen gibt es
  eine **Vorschau mit korrigierbarer Spaltenzuordnung** — Format-Probleme fallen
  so sofort auf. Logik: `src/lib/importParse.js`, Dialog: `src/components/standard/ImportModal.jsx`.
- **„Liste per Mail schicken"** (Notausgang) ist für alle sichtbar — wer schon
  eine Liste hat, muss nichts abtippen.
- **Zwischenspeichern im Browser** (`localStorage`): unterbrechen und später
  weitermachen; nach dem Absenden wird der Entwurf gelöscht. Logik in
  `src/lib/draft.js`.
- **Schätzen ausdrücklich erlaubt**, Pflichtfelder auf das Minimum (Adresse,
  Fläche, Heizungstyp, Verbrauch), Vertrag/Abrechnung eingeklappt.
- **Sanfte Hinweise** statt harter Fehler (`src/lib/plausibility.js`).

### Vorausgefüllte Links (für Kunden)

Im Admin-Bereich (`/admin`) gibt es **„+ Vorausgefüllten Link erstellen"**: Green
Fusion trägt die bekannten Daten ein (Ansprechpartner + Anlagen per Excel/CSV-Import)
und bekommt einen **kurzen Link** zum Verschicken. Der Kunde klickt → das Formular
ist schon ausgefüllt → er ergänzt nur den Heizungstyp.

- Kurzlink `…/standard?p=<id>`: Daten liegen in D1 (Tabelle `prefills`, 90 Tage),
  Endpunkte `functions/api/admin/prefill.js` (anlegen, geschützt) und
  `functions/api/prefill.js` (abrufen, öffentlich – die zufällige ID ist der Schlüssel).
- Ohne D1 erzeugt der Generator automatisch einen langen, selbsttragenden Link
  `…?prefill=<base64>` (Logik in `src/lib/prefill.js`). **Beide** Formulare lesen
  diese Form — `…/standard?prefill=…` und `…/sektorkopplung?prefill=…`; sie
  braucht weder Token noch Datenbank und läuft nicht ab, die URL wird aber lang.
  Bei der Sektorkopplung enthält der Link den kompletten Datenstand
  (`{ contact, sites: [...] }`), inklusive mehrerer Wärmepumpen je Anlage.
- Ein vorhandener Browser-Entwurf hat Vorrang, damit Kundenfortschritt nicht verloren geht.

### Bewusst noch nicht enthalten (spätere Stufen)

- **Vorausfüllen aus HubSpot**: technisch dieselben Mechanismen wie oben;
  `src/lib/prefill.js` liest auch einfache URL-Parameter
  (z. B. `…/standard?company=Musterbau&email=erika@…`).
- **Foto-Auslesen** von Abrechnung oder Typenschild.
- **PDF-Listen automatisch auslesen** (Excel/CSV-Import ist enthalten; PDFs
  laufen über den „Liste per Mail"-Notausgang).

> Hinweis: Eine **Cloud-Speicherung** (Entwürfe + Einreichungen in Cloudflare D1)
> samt Admin-Übersicht ist inzwischen enthalten – siehe Abschnitt 6b.

### Datenschutz

Vor dem Absenden ist ein **Pflicht-Häkchen** zu setzen. Der Versanddienst Brevo
ist **EU-betrieben**. Auftragsverarbeitungsverträge regelt Green Fusion separat.
```
