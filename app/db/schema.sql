-- Shared brain schema. The hub app creates this on demand (ensureSchema),
-- but you can also apply it manually against the Postgres service:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS hub_memory (
  id         BIGSERIAL PRIMARY KEY,
  agent      TEXT        NOT NULL DEFAULT 'unknown',
  kind       TEXT        NOT NULL DEFAULT 'note',
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hub_memory_created_idx
  ON hub_memory (created_at DESC);
