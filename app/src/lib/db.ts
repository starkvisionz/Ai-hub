import { Pool, types, type QueryResult, type QueryResultRow } from "pg";

// pg returns int8 (BIGSERIAL) as a string by default. Our ids fit comfortably in
// a JS number, and MemoryEntry.id is typed `number`, so parse int8 → number to
// keep runtime and types consistent (e.g. so id guards work on returned rows).
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10)));

// Lazily-created connection pool to the shared "brain" Postgres. Everything here
// degrades gracefully: if DATABASE_URL is unset or the DB is unreachable, calls
// return null instead of throwing, so the dashboard renders without a database.

let pool: Pool | null = null;
let poolTried = false;

function getPool(): Pool | null {
  if (poolTried) return pool;
  poolTried = true;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 10_000,
  });
  // Don't let background pool errors crash the process.
  pool.on("error", () => {});
  return pool;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T> | null> {
  const p = getPool();
  if (!p) return null;
  try {
    return await p.query<T>(text, params);
  } catch {
    return null;
  }
}
