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

Ein Objekt **pro Anlage**. Quelle: `shared/sektorExport.js` (dieselbe Datei
erzeugt auch die CSV im Mail-Anhang, damit beide Wege nicht auseinanderlaufen);
die Weitergabe selbst steckt in `shared/n8n.js`. Die Schlüssel sind zugleich die
Spaltenüberschriften im Sheet — auch die **Antworten** entsprechen wörtlich der
Auswahl des alten Google-Formulars (`Installiert & in Betrieb`,
`Nur Wärmepumpen und ggf. Heizstäbe`, …), damit Filter im Sheet greifen.

| Spalte / JSON-Schlüssel | Herkunft in GF-Forms |
| --- | --- |
| `Zeitstempel` | Absende-Zeitpunkt (Europe/Berlin, sekundengenau, z. B. `31.07.2026 10:37:02`; je Anlage +1 s, damit die Zeilen einer Einreichung unterscheidbar bleiben) |
| `Adressen aller Gebäude mit gleichen Eigenschaften` | Straße + PLZ + Stadt der Anlage |
| `Ihr Unternehmen` | Unternehmen (Ansprechpartner) |
| `Ihr Ansprechpartner bei Green Fusion` | Default `Daniel Lizardo` (`GF_DEFAULT_CONTACT`) |
| `Status Wärmepumpen-System` | Status der WP-Komponente (läuft schon / ist geplant) |
| `Wärmepumpen-Konfiguration` | WP-Topologie (bei mehreren WP mit `" \| "` getrennt) |
| `Hersteller der Wärmepumpe` | WP-Hersteller (bei mehreren WP mit `" \| "` getrennt) |
| `Wärmepumpen Controller (Modell- oder Serienname, z.B. ISG-Web)` | WP-Regler/Controller (bei mehreren WP mit `" \| "` getrennt) |
| `Andere Wärmeerzeuger ` | Weitere Wärmeerzeuger |
| `Status PV-Anlage` | Status der PV-Komponente |
| `PV-Anlage Konfiguration ` | PV-Größe (kWp) |
| `PV-Wechselrichter Hersteller` | PV-Wechselrichter Hersteller |
| `PV-Wechselrichter Modell / Serie` | PV-Wechselrichter Modell/Serie |
| `Nutzung von PV-Strom in ihrem Gebäude?` | PV-Nutzung |
| `PV-Partner ` | PV-Betreiber |
| `Gibt es ein Gebäudeleittechnik (GLT)-System oder Energiemonitoring/managementsystem (EMS) in ihrem Gebäude?` | EMS/GLT (Ja/Nein, ggf. Modbus) |
| `Was für einen Stromzähler hängt vor der Wärmepumpe?` | Zählerart (iMSys / mME / ETZ / HT-NT …) |
| `Was für Stromzähler gibt es bei Ihnen für der Wärmepumpe?` | Zähleraufteilung |
| `Berechnung der Einsparpotenziale (optional)` | Wunsch + Wärmebedarf, WE, Speicher, Strompreis als Text |
| `Status Wärmepumpen-System (alt)` | Liste der gewählten Komponenten |
| `Anlage Nr.` | laufende Nummer der Anlage innerhalb der Einreichung (Zusatzfeld) |
| `Einreichung` | ID der Einreichung – verbindet die Zeilen (Zusatzfeld) |

> **Wichtig:** Drei Schlüssel enthalten bewusst ein **abschließendes Leerzeichen**
> (`Andere Wärmeerzeuger `, `PV-Anlage Konfiguration `, `PV-Partner `), weil die
> Sheet-Spalten so heißen und der bestehende Flow sie so referenziert. Die
> Spaltenüberschriften im Sheet und diese Schlüssel müssen **zeichengenau**
> übereinstimmen (inkl. Leerzeichen), sonst greift die automatische Zuordnung
> nicht.

> **Mehrere Wärmepumpen je Anlage:** Eine Anlage kann verschiedene Wärmepumpen
> haben. Die Schlüssel bleiben unverändert — die Werte stehen dann mit `" | "`
> getrennt darin (`Stiebel Eltron | Vaillant` ↔ `ISG-Web | sensoNET`). Das i-te
> Teilstück gehört in jedem Feld zur i-ten Wärmepumpe; `—` heißt „für diese
> Wärmepumpe nicht angegeben".

## Es landet nur EINE Zeile im Sheet, obwohl mehrere Anlagen eingereicht wurden

GF-Forms schickt **einen POST je Anlage** (nacheinander, siehe
`forwardToN8n()` in `functions/api/submit.js`) und jede Anlage hat einen eigenen
Zeitstempel (sekundengenau, je Anlage +1 s) sowie die Felder `Anlage Nr.` und
`Einreichung`. Vier Anlagen = vier Aufrufe = vier Zeilen. Wenn trotzdem nur eine
Zeile ankommt, liegt es an der n8n-Seite. Diese vier Ursachen der Reihe nach
prüfen:

1. **Test-URL statt Produktions-URL.** Zeigt `N8N_WEBHOOK_URL` auf
   `…/webhook-test/…`, verarbeitet n8n nur den **ersten** Aufruf pro „Listen for
   test event"; die übrigen laufen ins Leere. Die Produktions-URL heißt
   `…/webhook/…` und der Workflow muss **aktiv** sein. Häufigste Ursache.
2. **Google-Sheets-Node auf „Append or Update" mit Matching-Spalte.** Wenn als
   Matching-Spalte etwas steht, das alle Anlagen gemeinsam haben (z. B. „Ihr
   Unternehmen" oder „Zeitstempel" bei minutengenauem Stempel), aktualisieren
   die folgenden Aufrufe **dieselbe Zeile** statt neue anzulegen. Auf
   **„Append"** stellen — oder als Matching-Spalte `Einreichung` **plus**
   `Anlage Nr.` verwenden.
3. **Dublettenfilter im Flow.** Ein „Filter New Entries"-Schritt, der auf
   Unternehmen oder Adresse vergleicht, wirft die weiteren Anlagen als
   Duplikate weg. Filter zusätzlich auf `Anlage Nr.` / `Einreichung` stützen.
4. **Ein Aufruf mit einem Array.** Kommt der Body als JSON-Array an (z. B. weil
   ein Zwischenschritt sammelt), ist das in n8n **ein** Item → eine Zeile. Die
   `Normalize`-Node in `n8n/GF-Forms-to-GoogleSheet.json` teilt Arrays deshalb
   inzwischen in einzelne Items auf; in Joshuas Flow leistet ein
   **Split-Out**-Node dasselbe.

Schneller Test ohne Formular: zwei Aufrufe hintereinander an die
Produktions-URL schicken und im Sheet nachsehen, ob zwei Zeilen entstehen.

```bash
for i in 1 2; do
  curl -sS -X POST "$N8N_WEBHOOK_URL" -H 'Content-Type: application/json' \
    -d "{\"Zeitstempel\":\"31.07.2026 10:0$i:00\",\"Ihr Ansprechpartner bei Green Fusion\":\"Test\",\"Ihr Unternehmen\":\"Testfirma\",\"Adressen aller Gebäude mit gleichen Eigenschaften\":\"Teststraße $i\",\"Anlage Nr.\":$i,\"Einreichung\":\"curl-test\"}"
done
```

Kommen dabei zwei Zeilen an, liegt es nicht am Webhook, sondern an einem
Schritt weiter hinten im Flow (Punkt 2 oder 3).

## Bekannte Punkte

- **Auto-Mapping braucht passende Überschriften:** Weicht eine Spaltenüberschrift
  im Sheet ab, entweder die Überschrift angleichen oder in der Google-Sheets-Node
  auf manuelles Mapping umstellen.
- **Standard-Formular (klassische Heizung):** wird derzeit **nicht** an n8n
  weitergegeben (der SK-Flow ist darauf zugeschnitten). Bei Bedarf später mit
  eigenem Mapping/Sheet ergänzbar.
