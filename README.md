# Green Fusion · Anlagen-Erfassungsformular

Zwei geführte Online-Formulare im Typeform-Stil, mit denen Kundinnen und Kunden
ihre Heizungsanlagen erfassen. Beim Absenden erstellt die Anwendung **server­seitig**
eine CSV im Format der bestehenden GF-Anlagenliste und verschickt **zwei E-Mails**
(an Green Fusion mit CSV-Anhang sowie eine Bestätigung an den Kunden) – ganz ohne
Download oder manuelles Anhängen.

- **Oberfläche:** React + Vite (komplett auf Deutsch)
- **Server-Teil:** Cloudflare Pages Function (`/api/submit`)
- **E-Mail-Versand:** Brevo (EU-betrieben)
- **Keine Datenbank** – die Daten verlassen die Anwendung ausschließlich per E-Mail.

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
├── functions/
│   └── api/
│       └── submit.js          ⭐ Serverseitiger Endpunkt: Validierung + Brevo-Versand
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
    ├── lib/                   Hilfsfunktionen (PLZ-Suche, Plausibilität, Prefill, API)
    ├── components/            Wiederverwendbare Felder & Layout
    └── routes/                Startseite, Formular 1, Formular 2, Dankeseite
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
- **Auswahloptionen** (Heizungstypen, Komponenten): `src/lib/options.js`.
- **Hersteller-Vorschläge**: `shared/manufacturers.js`.
- **Design-Farben/Schrift**: CSS-Variablen oben in `src/index.css`.
- **Schwelle „geführt vs. Tabelle"**: Konstante `GUIDED_MAX` in
  `src/routes/StandardForm.jsx` (Standard: 10).

### Bewusst noch nicht enthalten (spätere Stufen)

- **Vorausfüllen aus HubSpot** über personalisierte Links. Vorbereitet ist es
  bereits: `src/lib/prefill.js` liest passende URL-Parameter aus
  (z. B. `…/standard?company=Musterbau&email=erika@…&systemCount=3`).
- **Datenbank / dauerhafte Speicherung.** Die Logik ist gekapselt
  (`shared/submission.js`), sodass sich ein Speicherschritt später ergänzen lässt,
  ohne die Oberfläche zu ändern.
- **Foto-Auslesen** von Abrechnung oder Typenschild.

### Datenschutz

Vor dem Absenden ist ein **Pflicht-Häkchen** zu setzen. Der Versanddienst Brevo
ist **EU-betrieben**. Auftragsverarbeitungsverträge regelt Green Fusion separat.
```
