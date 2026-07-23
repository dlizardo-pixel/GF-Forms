# GF-Forms → Google Sheet → Notion (Sektorkopplung)

GF-Forms speist die Einreichungen in **dasselbe Google Sheet**, das eure
Kolleg:innen ohnehin als Referenz nutzen. Der bestehende n8n-Flow
**„TF Survey to SC Project List"** (mit dem Google-Sheets-Trigger) bleibt dabei
**komplett unverändert** — er feuert wie gewohnt, sobald eine neue Zeile im Sheet
landet.

```
GF-Forms  ──POST──▶  Webhook  ─▶  Google Sheet (neue Zeile)
                                        │
                                        ▼  (Google-Sheets-Trigger, wie bisher)
                          bestehender Flow: Notion-Projekt + Ampel + Slack
```

Bei jeder Sektorkopplungs-Einreichung sendet die App **ein JSON pro Anlage**. Die
JSON-Schlüssel entsprechen exakt den Spaltennamen im Sheet („Formularantworten 1"),
sodass die Google-Sheets-Node die Werte **automatisch** den richtigen Spalten
zuordnet.

---

## Einrichtung

### 1. Intake-Workflow importieren

Datei **`n8n/GF-Forms-to-GoogleSheet.json`** in n8n importieren
(**Workflows → Import from File**). Enthalten:

- **Webhook** (POST, Pfad `gf-forms`) als Trigger,
- **Normalize** (hebt den Webhook-Body auf die oberste Ebene),
- **Google Sheets – Append Row** (auto-map) auf Sheet „Formularantworten 1".

### 2. Google-Sheets-Node konfigurieren

- In der Node **„Google Sheets – Append Row"** deine **Google-Sheets-Credential**
  (mit Schreibrechten) auswählen. Das Dokument und das Tabellenblatt sind schon
  vorbelegt (Sheet-ID `17kxBcYJozJsj7Wg53etT3CvAvRfNMGHoMm9Bp38Rs18`, Blatt
  „Formularantworten 1"). Passt das nicht, hier korrigieren.
- Mapping steht auf **„Map Automatically"** — solange die Spaltenüberschriften im
  Sheet den JSON-Schlüsseln entsprechen (siehe Tabelle unten), muss nichts von
  Hand zugeordnet werden.

### 3. Webhook-URL in Cloudflare hinterlegen

Die **Production-URL** der Webhook-Node kopieren
(`https://<n8n>/webhook/gf-forms`) und in Cloudflare setzen:
Projekt `gf-forms` → **Settings → Variables and secrets** → Production:

| Name | Wert | Typ |
| --- | --- | --- |
| `N8N_WEBHOOK_URL` | die Production-URL | Secret |
| `GF_DEFAULT_CONTACT` | `Daniel Lizardo` (optional, ist Default) | Text |

Danach **neu deployen**. Ohne `N8N_WEBHOOK_URL` bleibt die Weitergabe aus — die
App läuft normal weiter.

### 4. Intake-Workflow aktivieren & testen

- Workflow in n8n **aktivieren** (er ist mit `active: false` importiert).
- Lokal testen: `.dev.vars` mit `N8N_WEBHOOK_URL` füllen, dann
  `npm run build && npm run pages:dev`, eine Sektorkopplung absenden → im Sheet
  erscheint pro Anlage eine neue Zeile, und der bestehende Flow verarbeitet sie.

---

## Feld-Mapping (App-JSON → Sheet-Spalte)

Ein Objekt **pro Anlage**. Quelle: `shared/n8n.js`. Die Schlüssel sind zugleich
die Spaltenüberschriften im Sheet.

| Spalte / JSON-Schlüssel | Herkunft in GF-Forms |
| --- | --- |
| `Adressen aller Gebäude mit gleichen Eigenschaften` | Straße + PLZ + Stadt der Anlage |
| `Ihr Unternehmen` | Unternehmen (Ansprechpartner) |
| `Ihr Ansprechpartner bei Green Fusion` | Default `Daniel Lizardo` (`GF_DEFAULT_CONTACT`) |
| `Status Wärmepumpen-System` | Status der WP-Komponente (läuft schon / ist geplant) |
| `Wärmepumpen-Konfiguration` | WP-Topologie |
| `Hersteller der Wärmepumpe` | WP-Hersteller |
| `Wärmepumpen Controller (Modell- oder Serienname, z.B. ISG-Web)` | WP-Regler/Controller |
| `Andere Wärmeerzeuger ` | Weitere Wärmeerzeuger |
| `Status PV-Anlage` | Status der PV-Komponente |
| `PV-Anlage Konfiguration ` | PV-Größe (kWp) |
| `PV-Wechselrichter Hersteller` | PV-Wechselrichter Hersteller |
| `PV-Wechselrichter Modell / Serie` | PV-Wechselrichter Modell/Serie |
| `Nutzung von PV-Strom in ihrem Gebäude?` | PV-Nutzung |
| `PV-Partner ` | PV-Betreiber |
| `Gibt es ein Gebäudeleittechnik (GLT)-System oder Energiemonitoring/managementsystem (EMS) in ihrem Gebäude?` | EMS/GLT (Ja/Nein, ggf. Modbus) |

> **Wichtig:** Drei Schlüssel enthalten bewusst ein **abschließendes Leerzeichen**
> (`Andere Wärmeerzeuger `, `PV-Anlage Konfiguration `, `PV-Partner `), weil die
> Sheet-Spalten so heißen und der bestehende Flow sie so referenziert. Die
> Spaltenüberschriften im Sheet und diese Schlüssel müssen **zeichengenau**
> übereinstimmen (inkl. Leerzeichen), sonst greift die automatische Zuordnung
> nicht.

## Bekannte Punkte

- **Auto-Mapping braucht passende Überschriften:** Weicht eine Spaltenüberschrift
  im Sheet ab, entweder die Überschrift angleichen oder in der Google-Sheets-Node
  auf manuelles Mapping umstellen.
- **Standard-Formular (klassische Heizung):** wird derzeit **nicht** an n8n
  weitergegeben (der SK-Flow ist darauf zugeschnitten). Bei Bedarf später mit
  eigenem Mapping/Sheet ergänzbar.
