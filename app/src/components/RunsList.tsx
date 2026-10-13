import Link from "next/link";
import type { Run } from "@/lib/agents";
import { runStatusChip } from "@/lib/agentUi";
import { timeAgo } from "@/lib/time";

function duration(run: Run): string | null {
  if (!run.finished_at) return null;
  const secs = Math.max(
    0,
    Math.round(
      (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000,
    ),
  );
  if (secs < 90) return `${secs}s`;
  return `${Math.round(secs / 60)}m`;
}

// The activity stream: one row per run, status-colored, agent linked.
export function RunsList({
  runs,
  dbConfigured,
  emptyHint,
}: {
  runs: Run[] | null;
  dbConfigured: boolean;
  emptyHint?: React.ReactNode;
}) {
  if (runs === null) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {dbConfigured
          ? "Database unreachable — check the Postgres service."
          : "No database connected yet. Set DATABASE_URL to enable the command center."}
      </p>
    );
  }
  if (runs.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {emptyHint ?? (
          <>
            No activity yet. Agents log work via{" "}
            <span className="font-mono">POST /api/runs</span>.
          </>
        )}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {runs.map((r) => {
        const dur = duration(r);
        return (
          <li key={r.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <span
              className={`mt-0.5 w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${runStatusChip[r.status] ?? runStatusChip.done}`}
            >
              {r.status}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                {r.task}
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <Link
                  href={`/agents/${encodeURIComponent(r.agent)}`}
                  className="font-mono hover:underline"
                >
                  {r.agent}
                </Link>
                {r.project && <span className="truncate">· {r.project}</span>}
                {r.detail && (
                  <span className="truncate text-slate-500" title={r.detail}>
                    · {r.detail}
                  </span>
                )}
              </p>
            </div>
            <span className="shrink-0 text-right text-xs text-slate-400">
              {timeAgo(r.started_at)}
              {dur && <span className="block text-slate-300 dark:text-slate-600">{dur}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
