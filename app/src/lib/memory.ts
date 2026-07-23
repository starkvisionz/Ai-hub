import { query, isDbConfigured } from "./db";

// The "shared brain": short context entries any agent (Claude, n8n, etc.) can
// read/write so sessions stay coordinated. Backed by the hub_memory table.

export type MemoryEntry = {
  id: number;
  agent: string;
  kind: string;
  content: string;
  created_at: string;
};

let schemaReady = false;

export async function ensureSchema(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  if (schemaReady) return true;
  const r = await query(`
    CREATE TABLE IF NOT EXISTS hub_memory (
      id         BIGSERIAL PRIMARY KEY,
      agent      TEXT        NOT NULL DEFAULT 'unknown',
      kind       TEXT        NOT NULL DEFAULT 'note',
      content    TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  if (r === null) return false;
  await query(
    `CREATE INDEX IF NOT EXISTS hub_memory_created_idx ON hub_memory (created_at DESC);`,
  );
  schemaReady = true;
  return true;
}

export async function recentMemory(
  limit = 20,
): Promise<MemoryEntry[] | null> {
  if (!(await ensureSchema())) return null;
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);
  const r = await query<MemoryEntry>(
    `SELECT id, agent, kind, content, created_at
       FROM hub_memory
      ORDER BY created_at DESC
      LIMIT $1`,
    [safeLimit],
  );
  return r ? r.rows : null;
}

export async function addMemory(input: {
  agent?: string;
  kind?: string;
  content: string;
}): Promise<MemoryEntry | null> {
  if (!(await ensureSchema())) return null;
  const content = input.content.trim();
  if (!content) return null;
  const r = await query<MemoryEntry>(
    `INSERT INTO hub_memory (agent, kind, content)
     VALUES ($1, $2, $3)
     RETURNING id, agent, kind, content, created_at`,
    [
      (input.agent ?? "unknown").slice(0, 120),
      (input.kind ?? "note").slice(0, 60),
      content.slice(0, 8000),
    ],
  );
  return r && r.rows[0] ? r.rows[0] : null;
}
