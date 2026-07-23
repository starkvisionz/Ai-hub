import type { MemoryEntry } from "@/lib/memory";
import { timeAgo } from "@/lib/time";

// Presentational list of shared-brain entries. `entries === null` means the DB
// was unreachable / unconfigured; the caller decides the surrounding chrome.
export function MemoryList({
  entries,
  dbConfigured,
  emptyHint,
}: {
  entries: MemoryEntry[] | null;
  dbConfigured: boolean;
  emptyHint?: string;
}) {
  if (entries === null) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {dbConfigured
          ? "Brain database unreachable — check the Postgres service."
          : "No database connected yet. Set DATABASE_URL to enable the shared brain."}
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {emptyHint ?? (
          <>
            No entries yet. Agents and n8n workflows can write context via{" "}
            <span className="font-mono">POST /api/memory</span>.
          </>
        )}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {entries.map((e) => (
        <li key={e.id} className="py-3 first:pt-0 last:pb-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
              {e.agent}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
              {e.kind}
            </span>
            <span className="ml-auto">{timeAgo(e.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {e.content}
          </p>
        </li>
      ))}
    </ul>
  );
}
