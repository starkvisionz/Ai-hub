import Link from "next/link";
import { recentMemory, memoryStats } from "@/lib/memory";
import { isDbConfigured } from "@/lib/db";
import { MemoryComposer } from "@/components/MemoryComposer";
import { MemoryList } from "@/components/MemoryList";
import { LiveRefresh } from "@/components/LiveRefresh";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function BrainPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    agent?: string;
    page?: string;
    pinned?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const kindFilter = sp.kind?.trim() ?? "";
  const agentFilter = sp.agent?.trim() ?? "";
  const pinnedOnly = sp.pinned === "1";
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [fetched, stats] = await Promise.all([
    recentMemory({
      limit: PAGE_SIZE + 1,
      offset,
      q: query || undefined,
      kind: kindFilter || undefined,
      agent: agentFilter || undefined,
      pinnedOnly,
    }),
    memoryStats(),
  ]);

  const hasNext = fetched !== null && fetched.length > PAGE_SIZE;
  const entries = fetched === null ? null : fetched.slice(0, PAGE_SIZE);
  const hasFilters = Boolean(query || kindFilter || agentFilter || pinnedOnly);

  const buildHref = (
    over: Partial<{
      q: string;
      kind: string;
      agent: string;
      page: number;
      pinned: boolean;
    }>,
  ) => {
    const params = new URLSearchParams();
    const q = over.q ?? query;
    const kind = over.kind ?? kindFilter;
    const agent = over.agent ?? agentFilter;
    const pinned = over.pinned ?? pinnedOnly;
    const p = over.page ?? 1;
    if (q) params.set("q", q);
    if (kind) params.set("kind", kind);
    if (agent) params.set("agent", agent);
    if (pinned) params.set("pinned", "1");
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/brain?${s}` : "/brain";
  };

  const exportHref = (format: "json" | "csv") => {
    const params = new URLSearchParams({ format });
    if (query) params.set("q", query);
    if (kindFilter) params.set("kind", kindFilter);
    if (agentFilter) params.set("agent", agentFilter);
    return `/api/export?${params.toString()}`;
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <LiveRefresh seconds={30} />

      <header className="mb-6">
        <Link
          href="/"
          className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
        >
          ← dashboard
        </Link>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shared brain</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Context any agent or workflow has written to the hub
              {stats ? ` · ${stats.total} total` : ""}.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 text-xs">
            <a
              href={exportHref("json")}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
            >
              Export JSON
            </a>
            <a
              href={exportHref("csv")}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
            >
              CSV
            </a>
            <a
              href="/api/feed?format=json"
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
              title="Recent context as a subscribable feed"
            >
              Feed
            </a>
          </div>
        </div>
      </header>

      <form method="get" className="mb-3 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search content, agent, or kind…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
        {kindFilter && <input type="hidden" name="kind" value={kindFilter} />}
        {agentFilter && <input type="hidden" name="agent" value={agentFilter} />}
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          Search
        </button>
        {hasFilters && (
          <Link
            href="/brain"
            className="grid place-items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-500 dark:border-slate-700"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="mb-2">
        <Link
          href={buildHref({ pinned: !pinnedOnly, page: 1 })}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${
            pinnedOnly
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-slate-200 text-slate-500 hover:border-amber-400 dark:border-slate-700 dark:text-slate-400"
          }`}
        >
          {pinnedOnly ? "★ pinned only" : "☆ pinned only"}
        </Link>
      </div>

      {stats && stats.byKind.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">kind</span>
          {stats.byKind.map((k) => {
            const active = k.kind === kindFilter;
            return (
              <Link
                key={k.kind}
                href={buildHref({ kind: active ? "" : k.kind })}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                {k.kind} <span className="opacity-60">{k.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      {stats && stats.byAgent.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-slate-400">agent</span>
          {stats.byAgent.map((a) => {
            const active = a.agent === agentFilter;
            return (
              <Link
                key={a.agent}
                href={buildHref({ agent: active ? "" : a.agent })}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                {a.agent} <span className="opacity-60">{a.count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <MemoryComposer />

      {hasFilters && (
        <p className="mb-3 text-xs text-slate-400">
          {entries === null ? "—" : entries.length} result
          {entries?.length === 1 ? "" : "s"} on this page
          {query && ` for “${query}”`}
          {kindFilter && ` · kind “${kindFilter}”`}
          {agentFilter && ` · agent “${agentFilter}”`}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <MemoryList
          entries={entries}
          dbConfigured={isDbConfigured()}
          manageable
          emptyHint={
            hasFilters
              ? "No entries match this filter."
              : "No entries yet — add one above or POST /api/memory."
          }
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
    </main>
  );
}
