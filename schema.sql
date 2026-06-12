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
  submitted_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries (updated_at);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries (status);
