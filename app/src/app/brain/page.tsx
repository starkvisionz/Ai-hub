import Link from "next/link";
import { recentMemory } from "@/lib/memory";
import { isDbConfigured } from "@/lib/db";
import { MemoryComposer } from "@/components/MemoryComposer";
import { MemoryList } from "@/components/MemoryList";
import { LiveRefresh } from "@/components/LiveRefresh";

export const dynamic = "force-dynamic";

export default async function BrainPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const entries = await recentMemory(100, query || undefined);

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
          Context any agent or workflow has written to the hub.
        </p>
      </header>

      <form method="get" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search content, agent, or kind…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          Search
        </button>
        {query && (
          <Link
            href="/brain"
            className="grid place-items-center rounded-lg border border-slate-200 px-3 text-sm text-slate-500 dark:border-slate-700"
          >
            Clear
          </Link>
        )}
      </form>

      <MemoryComposer />

      {query && (
        <p className="mb-3 text-xs text-slate-400">
          {entries === null ? "—" : entries.length} result
          {entries?.length === 1 ? "" : "s"} for “{query}”
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <MemoryList
          entries={entries}
          dbConfigured={isDbConfigured()}
          emptyHint={
            query
              ? `No entries match “${query}”.`
              : "No entries yet — add one above or POST /api/memory."
          }
        />
      </div>
    </main>
  );
}
