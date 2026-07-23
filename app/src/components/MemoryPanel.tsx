import { recentMemory } from "@/lib/memory";
import { isDbConfigured } from "@/lib/db";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export async function MemoryPanel() {
  const entries = await recentMemory(10);

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Shared brain — recent context
        </h2>
        <span className="text-xs text-slate-400">
          POST <span className="font-mono">/api/memory</span>
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        {entries === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isDbConfigured()
              ? "Brain database unreachable — check the Postgres service."
              : "No database connected yet. Set DATABASE_URL to enable the shared brain."}
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No entries yet. Agents and n8n workflows can write context via{" "}
            <span className="font-mono">POST /api/memory</span>.
          </p>
        ) : (
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
        )}
      </div>
    </section>
  );
}
