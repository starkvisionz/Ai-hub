import Link from "next/link";
import { getAgent, listRuns } from "@/lib/agents";
import { recentMemory } from "@/lib/memory";
import { isDbConfigured } from "@/lib/db";
import { badgeFor, presenceMeta } from "@/lib/agentUi";
import { AgentDeleteButton } from "@/components/AgentDeleteButton";
import { RunsList } from "@/components/RunsList";
import { MemoryList } from "@/components/MemoryList";
import { LiveRefresh } from "@/components/LiveRefresh";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: raw } = await params;
  const name = decodeURIComponent(raw);

  const [agent, runs, brain] = await Promise.all([
    getAgent(name),
    listRuns({ agent: name, limit: 50 }),
    recentMemory({ limit: 5, agent: name }),
  ]);

  if (agent === null) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Agent not found (or no database connected).{" "}
          <Link href="/agents" className="underline">
            Back to the command center
          </Link>
          .
        </p>
      </main>
    );
  }

  const presence = presenceMeta[agent.presence];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <LiveRefresh seconds={15} />

      <header className="mb-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative flex h-3 w-3">
            {presence.pulse && (
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${presence.dot}`}
              />
            )}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${presence.dot}`} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeFor(agent.type)}`}>
            {agent.type}
          </span>
          <span className="text-xs text-slate-400">
            {presence.label} · seen {timeAgo(agent.last_seen)}
          </span>
          <span className="ml-auto">
            <AgentDeleteButton name={agent.name} />
          </span>
        </div>

        {agent.description && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            {agent.description}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">project</dt>
            <dd className="mt-0.5 truncate font-mono text-slate-700 dark:text-slate-300">
              {agent.project || "—"}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wider text-slate-400">current task</dt>
            <dd className="mt-0.5 truncate text-slate-700 dark:text-slate-300">
              {agent.current_task || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-slate-400">runs / 24h</dt>
            <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
              {agent.runs_24h}
              {agent.failed_24h > 0 && (
                <span className="text-rose-500"> ({agent.failed_24h} failed)</span>
              )}
            </dd>
          </div>
        </dl>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          recent runs
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <RunsList
            runs={runs}
            dbConfigured={isDbConfigured()}
            emptyHint={
              <>
                No runs from this agent yet —{" "}
                <span className="font-mono">
                  scripts/agent-report.sh run-start {agent.name} &quot;task&quot;
                </span>
              </>
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            brain entries by {agent.name}
          </h2>
          <Link
            href={`/brain?agent=${encodeURIComponent(agent.name)}`}
            className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
          >
            all in the brain →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <MemoryList
            entries={brain}
            dbConfigured={isDbConfigured()}
            emptyHint="No shared-brain entries from this agent yet."
          />
        </div>
      </section>
    </main>
  );
}
