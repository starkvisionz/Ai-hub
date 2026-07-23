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
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const kindFilter = sp.kind?.trim() ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [fetched, stats] = await Promise.all([
    // Fetch one extra row to detect whether a next page exists.
    recentMemory({
      limit: PAGE_SIZE + 1,
      offset,
      q: query || undefined,
      kind: kindFilter || undefined,
    }),
    memoryStats(),
  ]);

  const hasNext = fetched !== null && fetched.length > PAGE_SIZE;
  const entries = fetched === null ? null : fetched.slice(0, PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (kindFilter) params.set("kind", kindFilter);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `/brain?${s}` : "/brain";
  };

  const chipHref = (k: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (k) params.set("kind", k);
    const s = params.toString();
    return s ? `/brain?${s}` : "/brain";
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Shared brain</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Context any agent or workflow has written to the hub
          {stats ? ` · ${stats.total} total` : ""}.
        </p>
      </header>

      <form method="get" className="mb-3 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search content, agent, or kind…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
        {kindFilter && <input type="hidden" name="kind" value={kindFilter} />}
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          Search
        </button>
        {(query || kindFilter) && (
          <Link
            href="/brain"
            className="grid place-items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-500 dark:border-slate-700"
          >
            Clear
          </Link>
        )}
      </form>

      {stats && stats.byKind.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {stats.byKind.map((k) => {
            const active = k.kind === kindFilter;
            return (
              <Link
                key={k.kind}
                href={active ? chipHref("") : chipHref(k.kind)}
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

      <MemoryComposer />

      {(query || kindFilter) && (
        <p className="mb-3 text-xs text-slate-400">
          {entries === null ? "—" : entries.length} result
          {entries?.length === 1 ? "" : "s"} on this page
          {query && ` for “${query}”`}
          {kindFilter && ` in kind “${kindFilter}”`}
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <MemoryList
          entries={entries}
          dbConfigured={isDbConfigured()}
          manageable
          emptyHint={
            query || kindFilter
              ? "No entries match this filter."
              : "No entries yet — add one above or POST /api/memory."
          }
        />
      </div>

      {(page > 1 || hasNext) && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
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
              href={pageHref(page + 1)}
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
