# GF-Forms → n8n → Notion (Sektorkopplung)

Diese Anleitung verbindet die GF-Forms-App mit dem bestehenden n8n-Flow
**„TF Survey to SC Project List"**. Bisher wird der Flow von einem
**Google-Sheets-Trigger** (alte Typeform-Antworten) ausgelöst. Künftig schickt
GF-Forms die Daten **direkt per Webhook** — die Datenquelle wird also getauscht,
der Rest des Flows bleibt fast gleich.

Bei jeder Sektorkopplungs-Einreichung sendet die App **ein JSON pro Anlage** an
den Webhook. Die JSON-Schlüssel entsprechen exakt den bisherigen
Google-Sheets-Spaltennamen, damit die vorhandenen Node-Ausdrücke
(`$json['Hersteller der Wärmepumpe']` usw.) weiter funktionieren.

---

## 1. In n8n: Webhook-Node anlegen

1. Den Flow „TF Survey to SC Project List" öffnen.
2. Neue Node **„Webhook"** hinzufügen (Methode **POST**, Pfad z. B. `gf-forms`).
3. **Production-URL** kopieren — sieht aus wie
   `https://<deine-n8n-instanz>/webhook/gf-forms`.
4. Den bisherigen **„Google Sheets Trigger"** vom ersten Verarbeitungsschritt
   trennen und stattdessen die **Webhook-Node** mit **„Filter New Entries"**
   verbinden. (Den Google-Sheets-Trigger kann man deaktiviert im Flow lassen.)

## 2. Drei Node-Referenzen umbenennen

Drei Ausdrücke verweisen noch namentlich auf den alten Trigger
`$('Google Sheets Trigger')`. Diese auf den Namen der Webhook-Node ändern
(z. B. `$('Webhook')`):

| Node | Feld |
| --- | --- |
| Create a database page → `Status WP-System` | `$('Google Sheets Trigger').item.json['Status Wärmepumpen-System']` |
| Create a database page → `Commercial Setup` | `$('Google Sheets Trigger').item.json['Nutzung von PV-Strom in ihrem Gebäude?']` |
| Create a database page → `Customer` | `$('Google Sheets Trigger').item.json['Ihr Unternehmen']` |

Alle übrigen Ausdrücke nutzen `$json[...]` und bleiben unverändert.

## 3. In Cloudflare: Webhook-URL hinterlegen

Cloudflare Dashboard → Projekt `gf-forms` → **Settings → Variables and secrets**
→ Production:

| Name | Wert | Typ |
| --- | --- | --- |
| `N8N_WEBHOOK_URL` | die Production-URL aus Schritt 1 | Secret |
| `GF_DEFAULT_CONTACT` | `Daniel Lizardo` (optional; das ist der Default) | Text |

Danach **neu deployen** (Retry deployment oder kleiner Push). Ohne
`N8N_WEBHOOK_URL` bleibt die Weitergabe aus — die App funktioniert normal weiter.

## 4. Testen

- Lokal (echter Webhook-Aufruf): `.dev.vars` mit `N8N_WEBHOOK_URL` füllen, dann
  `npm run build && npm run pages:dev`, eine Sektorkopplung absenden. In n8n
  erscheint pro Anlage eine Ausführung.
- Live: nach dem Deploy eine Testeinreichung machen und die n8n-Ausführungen
  prüfen.

---

## Feld-Mapping (App → n8n-JSON)

Ein Objekt **pro Anlage**. Quelle: `shared/n8n.js`.

| n8n-JSON-Schlüssel | Herkunft in GF-Forms |
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

> **Hinweis:** Drei Schlüssel enthalten bewusst ein **abschließendes Leerzeichen**
> (`Andere Wärmeerzeuger `, `PV-Anlage Konfiguration `, `PV-Partner `), weil der
> Flow sie so referenziert. Nicht „aufräumen".

## Offene Punkte / bekannte Lücken

- **Notion-Select-Werte:** Felder wie `Status Wärmepumpen-System` müssen als
  Select-Optionen in Notion existieren (z. B. „läuft schon" / „ist geplant"),
  sonst schlägt das Setzen fehl. Ggf. Optionsnamen in Notion angleichen.
- **Ampel-Abgleich:** Inverter- und Controller-Ampel funktionieren nur, wenn
  Hersteller **und** Modell/Serie getroffen werden. Beide Felder sind jetzt im
  Formular getrennt erfasst.
- **Standard-Formular (klassische Heizung):** wird derzeit **nicht** an n8n
  weitergegeben (der Flow ist auf Sektorkopplung zugeschnitten). Bei Bedarf
  später mit eigenem Mapping ergänzbar.
