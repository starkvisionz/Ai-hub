import Link from "next/link";
import { agentSummary, listAgents, listRuns, RUN_STATUSES } from "@/lib/agents";
import { isDbConfigured } from "@/lib/db";
import { AgentCard } from "@/components/AgentCard";
import { AgentRegisterForm } from "@/components/AgentRegisterForm";
import { RunsList } from "@/components/RunsList";
import { Sparkline } from "@/components/Sparkline";
import { LiveRefresh } from "@/components/LiveRefresh";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ agent?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const agentFilter = sp.agent?.trim() ?? "";
  const statusFilter = sp.status?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const [agents, summary, fetchedRuns] = await Promise.all([
    listAgents(),
    agentSummary(),
    listRuns({
      agent: agentFilter || undefined,
      status: statusFilter || undefined,
      limit: PAGE_SIZE + 1,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const hasNext = fetchedRuns !== null && fetchedRuns.length > PAGE_SIZE;
  const runs = fetchedRuns === null ? null : fetchedRuns.slice(0, PAGE_SIZE);
  const hasFilters = Boolean(agentFilter || statusFilter);

  const buildHref = (
    over: Partial<{ agent: string; status: string; page: number }>,
  ) => {
    const params = new URLSearchParams();
    const agent = over.agent ?? agentFilter;
    const status = over.status ?? statusFilter;
    const p = over.page ?? 1;
    if (agent) params.set("agent", agent);
    if (status) params.set("status", status);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/agents?${s}` : "/agents";
  };

  const tiles = summary
    ? [
        { label: "agents", value: String(summary.agents) },
        { label: "online", value: String(summary.online) },
        { label: "running now", value: String(summary.running) },
        { label: "runs / 24h", value: String(summary.runs_24h) },
        { label: "failed / 24h", value: String(summary.failed_24h) },
      ]
    : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <LiveRefresh seconds={15} />

      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Command center</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Every agent in the hub — who&apos;s online, what they&apos;re working
          on, and everything they&apos;ve run.
        </p>
      </header>

      {summary && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {tiles.map((t) => (
              <div
                key={t.label}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className={`text-2xl font-bold tracking-tight ${
                    t.label === "failed / 24h" && t.value !== "0"
                      ? "text-rose-500"
                      : t.label === "online" && t.value !== "0"
                        ? "text-emerald-500"
                        : ""
                  }`}
                >
                  {t.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">
                  {t.label}
                </div>
              </div>
            ))}
          </div>
          <div className="mb-8">
            <Sparkline perDay={summary.perDay} label="runs · last 14 days" unit="runs" />
          </div>
        </>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            agents
          </h2>
          <span className="text-xs text-slate-400">
            heartbeat: <span className="font-mono">POST /api/agents</span>
          </span>
        </div>

        <div className="mb-4">
          <AgentRegisterForm />
        </div>

        {agents === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isDbConfigured()
              ? "Database unreachable — check the Postgres service."
              : "No database connected yet. Set DATABASE_URL to enable the command center."}
          </p>
        ) : agents.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No agents registered yet — one-click the presets above, or have any
            agent report with{" "}
            <span className="font-mono">scripts/agent-report.sh heartbeat</span>.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            activity
          </h2>
          <span className="text-xs text-slate-400">
            log: <span className="font-mono">POST /api/runs</span>
          </span>
        </div>

        {(agents?.length ?? 0) > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-slate-400">agent</span>
            {agents!.map((a) => {
              const active = a.name === agentFilter;
              return (
                <Link
                  key={a.name}
                  href={buildHref({ agent: active ? "" : a.name })}
                  className={`rounded-full border px-2.5 py-1 text-xs transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  {a.name}
                </Link>
              );
            })}
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">status</span>
          {RUN_STATUSES.map((s) => {
            const active = s === statusFilter;
            return (
              <Link
                key={s}
                href={buildHref({ status: active ? "" : s })}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                {s}
              </Link>
            );
          })}
          {hasFilters && (
            <Link href="/agents" className="text-xs text-slate-400 underline">
              clear
            </Link>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <RunsList
            runs={runs}
            dbConfigured={isDbConfigured()}
            emptyHint={hasFilters ? "No runs match this filter." : undefined}
          />
        </div>

        {(page > 1 || hasNext) && (
          <nav className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link
                href={buildHref({ page: page - 1 })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-400">page {page}</span>
            {hasNext ? (
              <Link
                href={buildHref({ page: page + 1 })}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300"
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
