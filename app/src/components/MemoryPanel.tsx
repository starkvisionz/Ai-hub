import Link from "next/link";
import { recentMemory } from "@/lib/memory";
import { isDbConfigured } from "@/lib/db";
import { MemoryComposer } from "./MemoryComposer";
import { MemoryList } from "./MemoryList";

export async function MemoryPanel() {
  const entries = await recentMemory(10);

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Shared brain — recent context
        </h2>
        <Link
          href="/brain"
          className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
        >
          browse & search →
        </Link>
      </div>

      <MemoryComposer />

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <MemoryList entries={entries} dbConfigured={isDbConfigured()} />
      </div>
    </section>
  );
}
