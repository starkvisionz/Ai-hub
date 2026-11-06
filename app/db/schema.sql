-- Shared brain schema. The hub app creates this on demand (ensureSchema),
-- but you can also apply it manually against the Postgres service:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE TABLE IF NOT EXISTS hub_memory (
  id         BIGSERIAL PRIMARY KEY,
  agent      TEXT        NOT NULL DEFAULT 'unknown',
  kind       TEXT        NOT NULL DEFAULT 'note',
  content    TEXT        NOT NULL,
  pinned     BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Additive migration for tables created before the pinned column existed.
ALTER TABLE hub_memory ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS hub_memory_created_idx
  ON hub_memory (created_at DESC);

-- Agent command center: registry + activity (see src/lib/agents.ts, which also
-- creates these on demand).

CREATE TABLE IF NOT EXISTS hub_agents (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT        NOT NULL UNIQUE,
  type         TEXT        NOT NULL DEFAULT 'other',
  description  TEXT        NOT NULL DEFAULT '',
  project      TEXT        NOT NULL DEFAULT '',
  current_task TEXT        NOT NULL DEFAULT '',
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hub_runs (
  id          BIGSERIAL PRIMARY KEY,
  agent       TEXT        NOT NULL,
  project     TEXT        NOT NULL DEFAULT '',
  task        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'running',
  detail      TEXT        NOT NULL DEFAULT '',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS hub_runs_agent_idx ON hub_runs (agent, started_at DESC);
CREATE INDEX IF NOT EXISTS hub_runs_started_idx ON hub_runs (started_at DESC);
