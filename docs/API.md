# Integrations-API: Vorausgefüllte Formular-Links per Aufruf erzeugen

Mit dieser API können externe Tools (Scripts, Claude, Zapier, CRM …) einen
**vorausgefüllten Formular-Link** erzeugen — dieselbe Mechanik wie der Button
„Vorausgefüllten Link erstellen" im Admin-Bereich. Typischer Anwendungsfall:
Aus Meeting-Notizen/Transcripts (z. B. Kickscale) werden Firma, Ansprechpartner
und Anlagen extrahiert, per API eingereicht, und der zurückgegebene Link wird
dem Kunden geschickt. Der Kunde ergänzt nur noch, was fehlt.

---

## 1. Einmalige Einrichtung (Cloudflare)

1. Cloudflare Dashboard → **Workers & Pages** → Projekt `gf-forms` →
   **Settings → Variables and secrets**.
2. Variable **`PREFILL_API_TOKEN`** anlegen, Typ **Secret**, Umgebung
   **Production**. Als Wert einen langen Zufallswert verwenden, z. B. aus
   `openssl rand -hex 32` oder einem Passwortmanager (mind. 30 Zeichen).
3. **Retry deployment** (oder auf den nächsten Deploy warten).

Ohne gesetzten Token antwortet die API mit `503` („nicht konfiguriert") —
sie ist also standardmäßig aus. Der Token ist bewusst **nicht** das
Admin-Passwort: Er kann in Tools hinterlegt und unabhängig ausgetauscht werden.

## 2. Endpunkt

```
POST https://<deine-domain>/api/v1/prefill-link
Authorization: Bearer <PREFILL_API_TOKEN>
Content-Type: application/json
```

Body:

```json
{
  "type": "standard",
  "payload": { "project": { … }, "systems": [ { … } ] }
}
```

Antwort (`200`):

```json
{
  "ok": true,
  "id": "kA3b9xY_2mQ1",
  "url": "https://<deine-domain>/standard?p=kA3b9xY_2mQ1"
}
```

Fehler: `401` (Token falsch/fehlend), `400` (Body ungültig, mit deutscher
Fehlermeldung im Feld `error`), `503` (Token oder Datenbank nicht konfiguriert).

Die Links sind **90 Tage** gültig (danach werden die hinterlegten Daten
automatisch gelöscht). Öffnet der Kunde den Link, während im selben Browser ein
eigener Entwurf existiert, gewinnt der Entwurf (Fortschritt geht nicht verloren).

## 3. Payload-Format

### `type: "standard"` (klassisches Formular → `/standard?p=…`)

```json
{
  "type": "standard",
  "payload": {
    "project": {
      "contactName": "Max Mustermann",
      "contactRole": "Technischer Leiter",
      "company": "Wohnbau Beispiel eG",
      "contactEmail": "max@beispiel.de"
    },
    "systems": [
      {
        "streetHeating": "Beispielstraße 12",
        "plz": "10115",
        "city": "Berlin",
        "heatingTypes": ["Gas zentral"],
        "heatingTypeOther": "",
        "residentialUnits": "24",
        "heatedAreaM2": "1800",
        "consumptionLastYear": "210000",
        "consumptionPrevYear": "",
        "specialNotes": "PV auf dem Dach geplant"
      }
    ]
  }
}
```

Alle Felder sind optional — was fehlt, ergänzt der Kunde. `project` und
`systems` müssen aber vorhanden sein (`systems` darf leer sein: `[]`).

Gültige Werte für `heatingTypes` (Mehrfachauswahl, exakte Schreibweise):

| Wert |
| --- |
| `Gas zentral` |
| `Gaskombi` |
| `Hybridanlage (Gas + WP)` |
| `Wärmepumpe` |
| `Fernwärme` |
| `BHKW` |
| `Öl` |
| `Holz-Pellets` |
| `Nachtspeicher / Elektro` |
| `Was anderes / weiß nicht` (dazu `heatingTypeOther` als Freitext) |

> **Im Zweifel `heatingTypes` leer lassen** (`[]`) — das Feld ist im Formular
> orange markiert und der Kunde wählt selbst. Falsch geraten ist schlechter als
> leer.
>
> Verbrauchswerte in der **Einheit des Energieträgers** angeben (Gas: kWh,
> Öl: Liter, Pellets: Tonnen …) — das Formular rechnet selbst in kWh um und
> zeigt die Einheit an.

Weitere optionale System-Felder (selten nötig): `multiSupply` (true/false),
`supplyCount`, `districtHeatingConnectionKw`, `caretakerContact`,
`caretakerPhone`, `billingAddress`, `billingEmail`, `referenceNumber`.

### `type: "sektorkopplung"` (Wärmepumpe/PV → `/sektorkopplung?p=…`)

```json
{
  "type": "sektorkopplung",
  "payload": {
    "contact": {
      "contactName": "Max Mustermann",
      "company": "Wohnbau Beispiel eG",
      "contactEmail": "max@beispiel.de",
      "contactPhone": "030 1234567"
    },
    "sites": [
      {
        "streetHeating": "Beispielstraße 12",
        "plz": "10115",
        "city": "Berlin",
        "residentialUnits": "24"
      }
    ]
  }
}
```

`contact` und `sites` müssen vorhanden sein. Die Detailfelder pro Anlage
(Komponenten, PV-Nutzung usw.) füllt sinnvollerweise der Kunde — für den
Prefill reichen Adresse und Kontakt.

## 4. Beispiele

curl:

```bash
curl -X POST "https://<deine-domain>/api/v1/prefill-link" \
  -H "Authorization: Bearer $PREFILL_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "standard",
    "payload": {
      "project": { "company": "Wohnbau Beispiel eG", "contactName": "Max Mustermann", "contactEmail": "max@beispiel.de" },
      "systems": [
        { "streetHeating": "Beispielstraße 12", "plz": "10115", "city": "Berlin", "heatingTypes": ["Gas zentral"] }
      ]
    }
  }'
```

Node (fetch):

```js
const res = await fetch('https://<deine-domain>/api/v1/prefill-link', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.PREFILL_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ type: 'standard', payload }),
});
const { ok, url, error } = await res.json();
```

Lokal testen (`npm run dev`): derselbe Aufruf gegen
`http://localhost:5173/api/v1/prefill-link` — im Dev-Modus wird jeder
nicht-leere Bearer-Token akzeptiert.

## 5. Anleitung für Claude: Kickscale-Transcripts → Formular-Link

Dieser Abschnitt ist als Arbeitsanweisung für eine Claude-Session gedacht
(on demand, kein Cronjob). Siehe auch das Skill unter
`.claude/skills/kickscale-link/`.

1. **Deal-Ordner lesen:** Alle `.md`-Dateien des genannten Unternehmens lesen
   (Deal-Infos, Meeting-Transcripts).
2. **Extrahieren** (nur, was klar belegt ist):
   - `project.company`, `project.contactName`, `project.contactRole`,
     `project.contactEmail`
   - pro Anlage: `streetHeating`, `plz`, `city`, `heatingTypes`,
     `residentialUnits`, `heatedAreaM2`, `consumptionLastYear`, `specialNotes`
   - Heizungsbegriffe auf die gültigen Werte mappen, z. B.
     „Gasetagenheizung" → `Gaskombi`, „zentrale Gastherme"/„Gaskessel" →
     `Gas zentral`, „Blockheizkraftwerk" → `BHKW`, „Pelletheizung" →
     `Holz-Pellets`. Unklare Angaben → `heatingTypes: []` lassen.
   - **Nichts erfinden.** Vage Aussagen („so um die 20 Gebäude") lieber in
     `specialNotes` notieren als in Zahlenfelder schreiben.
3. **API aufrufen** (`POST /api/v1/prefill-link`, Token aus der
   Umgebungsvariablen `PREFILL_API_TOKEN` oder beim Nutzer erfragen).
4. **Ergebnis präsentieren:** den Link und eine kurze Tabelle, welche Felder
   vorausgefüllt wurden und was der Kunde noch ergänzen muss.
