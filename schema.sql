-- Datenbank-Schema für Green-Fusion-Formular (Cloudflare D1).
-- Speichert sowohl Entwürfe (status='draft') als auch eingereichte
-- Erfassungen (status='submitted'). Personenbezogene Daten werden nach
-- Ablauf der Aufbewahrungsfrist (siehe functions/_lib/store.js) automatisch
-- gelöscht.
--
-- Einspielen:
--   wrangler d1 execute gf-forms-db --file=./schema.sql            (lokal)
--   wrangler d1 execute gf-forms-db --remote --file=./schema.sql   (live)

CREATE TABLE IF NOT EXISTS entries (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,            -- 'standard' | 'sektorkopplung'
  status        TEXT NOT NULL,            -- 'draft' | 'submitted'
  company       TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  system_count  INTEGER,
  data          TEXT NOT NULL,            -- vollständige Eingaben als JSON
  created_at    TEXT NOT NULL,            -- ISO-Zeitstempel
  updated_at    TEXT NOT NULL,
  submitted_at  TEXT,
  deleted_at    TEXT,                     -- gesetzt = im Papierkorb (soft delete)
  email_status  TEXT,                     -- 'verschickt' | 'fehlgeschlagen' | 'kein_api_key'
  email_error   TEXT                      -- Fehlertext des Mail-Versands (falls vorhanden)
);

-- Bestehende Datenbanken: fügt neuere Spalten nachträglich hinzu.
-- Fehlermeldung „duplicate column name: …" bedeutet, dass sie schon
-- existiert – dann einfach ignorieren. (Der Code migriert zusätzlich selbst.)
-- ALTER TABLE entries ADD COLUMN deleted_at TEXT;
-- ALTER TABLE entries ADD COLUMN email_status TEXT;
-- ALTER TABLE entries ADD COLUMN email_error TEXT;

CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries (updated_at);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries (status);

-- Vorausgefüllte Links: Green Fusion legt die bekannten Anlagendaten ab und
-- verschickt nur eine kurze ID im Link (statt der kompletten Daten in der URL).
CREATE TABLE IF NOT EXISTS prefills (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,                 -- { project, systems } als JSON
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prefills_created ON prefills (created_at);
