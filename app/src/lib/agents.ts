import { query, isDbConfigured } from "./db";

// Agent command center data layer: a registry of agents (hub_agents) and their
// activity (hub_runs). Agents — Claude Code sessions, Codex wrappers, Hermes,
// n8n — report via POST /api/agents (heartbeat) and POST/PATCH /api/runs.
// Same conventions as memory.ts: parameterized SQL, null-on-failure.

export type AgentRow = {
  id: number;
  name: string;
  type: string;
  description: string;
  project: string;
  current_task: string;
  last_seen: string;
  created_at: string;
};

export type Presence = "online" | "idle" | "offline";

export type Agent = AgentRow & {
  presence: Presence;
  runs_24h: number;
  failed_24h: number;
  last_run_status: string | null;
};

export type Run = {
  id: number;
  agent: string;
  project: string;
  task: string;
  status: "running" | "done" | "failed";
  detail: string;
  started_at: string;
  finished_at: string | null;
};

export const RUN_STATUSES = ["running", "done", "failed"] as const;

const NAME_RE = /^[a-zA-Z0-9][\w.-]{0,63}$/;

export function validAgentName(name: unknown): name is string {
  return typeof name === "string" && NAME_RE.test(name);
}

// Presence thresholds: heartbeats within 2 min = online, 15 min = idle.
export function presenceOf(lastSeen: string | Date): Presence {
  const age = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  if (age < 120) return "online";
  if (age < 900) return "idle";
  return "offline";
}

let agentsSchemaReady = false;

export async function ensureAgentSchema(): Promise<boolean> {
  if (!isDbConfigured()) return false;
  if (agentsSchemaReady) return true;
  const r = await query(`
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
  `);
  if (r === null) return false;
  await query(`
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
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS hub_runs_agent_idx ON hub_runs (agent, started_at DESC);`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS hub_runs_started_idx ON hub_runs (started_at DESC);`,
  );
  agentsSchemaReady = true;
  return true;
}

// Register or heartbeat an agent. Omitted (undefined) fields keep their stored
// value; explicit "" clears project/current_task. last_seen always advances.
export async function upsertAgent(input: {
  name: string;
  type?: string;
  description?: string;
  project?: string;
  current_task?: string;
}): Promise<AgentRow | null> {
  if (!validAgentName(input.name)) return null;
  if (!(await ensureAgentSchema())) return null;
  const r = await query<AgentRow>(
    `INSERT INTO hub_agents (name, type, description, project, current_task)
     VALUES ($1, COALESCE($2,'other'), COALESCE($3,''), COALESCE($4,''), COALESCE($5,''))
     ON CONFLICT (name) DO UPDATE SET
       last_seen    = now(),
       type         = COALESCE($2, hub_agents.type),
       description  = COALESCE($3, hub_agents.description),
       project      = COALESCE($4, hub_agents.project),
       current_task = COALESCE($5, hub_agents.current_task)
     RETURNING *`,
    [
      input.name,
      input.type?.trim().slice(0, 32) ?? null,
      input.description?.trim().slice(0, 500) ?? null,
      input.project !== undefined ? input.project.trim().slice(0, 120) : null,
      input.current_task !== undefined
        ? input.current_task.trim().slice(0, 300)
        : null,
    ],
  );
  return r && r.rows[0] ? r.rows[0] : null;
}

export async function listAgents(): Promise<Agent[] | null> {
  if (!(await ensureAgentSchema())) return null;
  const r = await query<AgentRow & { runs_24h: number; failed_24h: number; last_run_status: string | null }>(
    `SELECT a.*,
            (SELECT count(*) FROM hub_runs r
              WHERE r.agent = a.name
                AND r.started_at >= now() - interval '24 hours')::int AS runs_24h,
            (SELECT count(*) FROM hub_runs r
              WHERE r.agent = a.name AND r.status = 'failed'
                AND r.started_at >= now() - interval '24 hours')::int AS failed_24h,
            (SELECT r.status FROM hub_runs r
              WHERE r.agent = a.name
              ORDER BY r.started_at DESC LIMIT 1) AS last_run_status
       FROM hub_agents a
      ORDER BY a.last_seen DESC`,
  );
  if (r === null) return null;
  return r.rows.map((row) => ({ ...row, presence: presenceOf(row.last_seen) }));
}

export async function getAgent(name: string): Promise<Agent | null> {
  const all = await listAgents();
  return all?.find((a) => a.name === name) ?? null;
}

export async function deleteAgent(name: string): Promise<boolean> {
  if (!validAgentName(name)) return false;
  if (!(await ensureAgentSchema())) return false;
  const r = await query(`DELETE FROM hub_agents WHERE name = $1`, [name]);
  return r ? r.rowCount === 1 : false;
}

// Log a run. A 'running' run becomes the agent's current task; the agent's
// last_seen advances either way (a run report is also a heartbeat).
export async function logRun(input: {
  agent: string;
  task: string;
  project?: string;
  status?: string;
  detail?: string;
}): Promise<Run | null> {
  if (!validAgentName(input.agent)) return null;
  const task = input.task?.trim();
  if (!task) return null;
  if (!(await ensureAgentSchema())) return null;
  const status = (RUN_STATUSES as readonly string[]).includes(input.status ?? "")
    ? (input.status as Run["status"])
    : "running";
  const r = await query<Run>(
    `INSERT INTO hub_runs (agent, project, task, status, detail, finished_at)
     VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'running' THEN NULL ELSE now() END)
     RETURNING *`,
    [
      input.agent,
      (input.project ?? "").trim().slice(0, 120),
      task.slice(0, 300),
      status,
      (input.detail ?? "").trim().slice(0, 2000),
    ],
  );
  if (!r || !r.rows[0]) return null;
  await upsertAgent({
    name: input.agent,
    project: input.project,
    current_task: status === "running" ? task.slice(0, 300) : "",
  });
  return r.rows[0];
}

// Finish/update a run; clears the agent's current task if it matches.
export async function updateRun(
  id: number,
  patch: { status: string; detail?: string },
): Promise<Run | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  if (!(RUN_STATUSES as readonly string[]).includes(patch.status)) return null;
  if (!(await ensureAgentSchema())) return null;
  const r = await query<Run>(
    `UPDATE hub_runs SET
       status = $2,
       detail = CASE WHEN $3::text IS NULL THEN detail ELSE $3 END,
       finished_at = CASE WHEN $2 = 'running' THEN NULL ELSE now() END
     WHERE id = $1
     RETURNING *`,
    [id, patch.status, patch.detail?.trim().slice(0, 2000) ?? null],
  );
  const run = r && r.rows[0] ? r.rows[0] : null;
  if (run && run.status !== "running") {
    await query(
      `UPDATE hub_agents SET last_seen = now(),
              current_task = CASE WHEN current_task = $2 THEN '' ELSE current_task END
        WHERE name = $1`,
      [run.agent, run.task],
    );
  }
  return run;
}

export async function listRuns(opts: {
  agent?: string;
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Run[] | null> {
  if (!(await ensureAgentSchema())) return null;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts.agent?.trim()) {
    params.push(opts.agent.trim());
    conditions.push(`agent = $${params.length}`);
  }
  if (opts.status && (RUN_STATUSES as readonly string[]).includes(opts.status)) {
    params.push(opts.status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(Math.min(Math.max(1, Math.floor(opts.limit ?? 30)), 101));
  const limitP = `$${params.length}`;
  params.push(Math.max(0, Math.floor(opts.offset ?? 0)));
  const offsetP = `$${params.length}`;
  const r = await query<Run>(
    `SELECT * FROM hub_runs ${where}
      ORDER BY started_at DESC
      LIMIT ${limitP} OFFSET ${offsetP}`,
    params,
  );
  return r ? r.rows : null;
}

export type AgentSummary = {
  agents: number;
  online: number;
  running: number;
  runs_24h: number;
  failed_24h: number;
  perDay: { day: string; count: number }[];
};

export async function agentSummary(): Promise<AgentSummary | null> {
  const agents = await listAgents();
  if (agents === null) return null;
  const counts = await query<{ runs_24h: string; failed_24h: string; running: string }>(
    `SELECT
       (SELECT count(*) FROM hub_runs
         WHERE started_at >= now() - interval '24 hours')::text AS runs_24h,
       (SELECT count(*) FROM hub_runs
         WHERE status = 'failed'
           AND started_at >= now() - interval '24 hours')::text AS failed_24h,
       (SELECT count(*) FROM hub_runs WHERE status = 'running')::text AS running`,
  );
  const dayRes = await query<{ day: string; count: string }>(
    `SELECT to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
            count(*)::text AS count
       FROM hub_runs
      WHERE started_at >= now() - interval '13 days'
      GROUP BY day ORDER BY day`,
  );
  return {
    agents: agents.length,
    online: agents.filter((a) => a.presence === "online").length,
    running: Number(counts?.rows[0]?.running ?? 0),
    runs_24h: Number(counts?.rows[0]?.runs_24h ?? 0),
    failed_24h: Number(counts?.rows[0]?.failed_24h ?? 0),
    perDay: (dayRes?.rows ?? []).map((d) => ({ day: d.day, count: Number(d.count) })),
  };
}
