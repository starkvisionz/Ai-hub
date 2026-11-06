import Link from "next/link";
import { agentSummary, listAgents } from "@/lib/agents";
import { presenceMeta, badgeFor } from "@/lib/agentUi";

// Compact command-center teaser for the dashboard. Silent without a database.
export async function AgentsStrip() {
  const [summary, agents] = await Promise.all([agentSummary(), listAgents()]);
  if (!summary) return null;

  return (
    <Link
      href="/agents"
      className="mb-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        agents
      </span>
      <span className="text-sm text-slate-700 dark:text-slate-300">
        <span className={summary.online > 0 ? "font-semibold text-emerald-500" : ""}>
          {summary.online} online
        </span>{" "}
        / {summary.agents} registered
        {summary.running > 0 && <> · {summary.running} running now</>} ·{" "}
        {summary.runs_24h} runs/24h
        {summary.failed_24h > 0 && (
          <span className="text-rose-500"> · {summary.failed_24h} failed</span>
        )}
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        {(agents ?? []).slice(0, 5).map((a) => (
          <span
            key={a.name}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${badgeFor(a.type)}`}
            title={`${a.name} · ${a.presence}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${presenceMeta[a.presence].dot}`} />
            {a.name}
          </span>
        ))}
        <span className="text-xs text-slate-400">open →</span>
      </span>
    </Link>
  );
}
