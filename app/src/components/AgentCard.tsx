import Link from "next/link";
import type { Agent } from "@/lib/agents";
import { accentFor, badgeFor, presenceMeta } from "@/lib/agentUi";
import { timeAgo } from "@/lib/time";

// One agent tile in the command center grid. Fully clickable; pulses when online.
export function AgentCard({ agent }: { agent: Agent }) {
  const presence = presenceMeta[agent.presence];
  return (
    <Link
      href={`/agents/${encodeURIComponent(agent.name)}`}
      className={`block rounded-xl border border-l-4 border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${accentFor(agent.type)}`}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {presence.pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${presence.dot}`}
            />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${presence.dot}`}
            title={presence.label}
          />
        </span>
        <h3 className="truncate font-semibold">{agent.name}</h3>
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeFor(agent.type)}`}
        >
          {agent.type}
        </span>
      </div>

      <p className="mt-2 min-h-[1.25rem] truncate text-sm text-slate-600 dark:text-slate-400">
        {agent.current_task ? (
          <>
            <span className="text-sky-500">▸</span> {agent.current_task}
          </>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">
            {agent.description || "no active task"}
          </span>
        )}
      </p>

      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
        {agent.project && (
          <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
            {agent.project}
          </span>
        )}
        <span className="ml-auto shrink-0">
          {agent.runs_24h} run{agent.runs_24h === 1 ? "" : "s"}/24h
          {agent.failed_24h > 0 && (
            <span className="text-rose-500"> · {agent.failed_24h} failed</span>
          )}
        </span>
        <span className="shrink-0">{timeAgo(agent.last_seen)}</span>
      </div>
    </Link>
  );
}
