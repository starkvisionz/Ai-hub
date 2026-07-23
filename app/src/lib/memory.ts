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
  q?: string,
  kind?: string,
): Promise<MemoryEntry[] | null> {
  if (!(await ensureSchema())) return null;
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);
  const term = q?.trim();
  const kindFilter = kind?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (term) {
    params.push(term);
    const p = `$${params.length}`;
    conditions.push(
      `(content ILIKE '%' || ${p} || '%' OR agent ILIKE '%' || ${p} || '%' OR kind ILIKE '%' || ${p} || '%')`,
    );
  }
  if (kindFilter) {
    params.push(kindFilter);
    conditions.push(`kind = $${params.length}`);
  }
  params.push(safeLimit);
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const r = await query<MemoryEntry>(
    `SELECT id, agent, kind, content, created_at
       FROM hub_memory
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}`,
    params,
  );
  return r ? r.rows : null;
}

export async function deleteMemory(id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) return false;
  if (!(await ensureSchema())) return false;
  const r = await query(`DELETE FROM hub_memory WHERE id = $1`, [id]);
  return r ? r.rowCount === 1 : false;
}

export type MemoryStats = {
  total: number;
  byKind: { kind: string; count: number }[];
  lastAt: string | null;
};

export async function memoryStats(): Promise<MemoryStats | null> {
  if (!(await ensureSchema())) return null;
  const totalRes = await query<{ total: string; last_at: string | null }>(
    `SELECT count(*)::text AS total, max(created_at) AS last_at FROM hub_memory`,
  );
  if (totalRes === null) return null;
  const kindRes = await query<{ kind: string; count: string }>(
    `SELECT kind, count(*)::text AS count
       FROM hub_memory
      GROUP BY kind
      ORDER BY count(*) DESC
      LIMIT 12`,
  );
  return {
    total: Number(totalRes.rows[0]?.total ?? 0),
    lastAt: totalRes.rows[0]?.last_at ?? null,
    byKind: (kindRes?.rows ?? []).map((k) => ({
      kind: k.kind,
      count: Number(k.count),
    })),
  };
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
