import { memoryStats } from "@/lib/memory";
import { timeAgo } from "@/lib/time";

// Compact stat tiles + a kind-distribution bar chart summarizing the shared
// brain. Silent (renders nothing) when there's no database, so the dashboard
// stays clean pre-DB.
export async function StatRow() {
  const stats = await memoryStats();
  if (!stats) return null;

  const tiles: { label: string; value: string }[] = [
    { label: "brain entries", value: String(stats.total) },
    { label: "kinds", value: String(stats.byKind.length) },
    {
      label: "last activity",
      value: stats.lastAt ? timeAgo(stats.lastAt) : "—",
    },
  ];

  const max = Math.max(1, ...stats.byKind.map((k) => k.count));

  return (
    <div className="mb-10">
      <div className="grid grid-cols-3 gap-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-2xl font-bold tracking-tight">{t.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-slate-400">
              {t.label}
            </div>
          </div>
        ))}
      </div>

      {stats.byKind.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            entries by kind
          </div>
          <ul className="space-y-2">
            {stats.byKind.map((k) => (
              <li key={k.kind} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-xs text-slate-500 dark:text-slate-400">
                  {k.kind}
                </span>
                <span
                  className="flex h-4 items-center"
                  style={{ width: `${(k.count / max) * 100}%`, minWidth: "0.5rem" }}
                  role="img"
                  aria-label={`${k.kind}: ${k.count}`}
                >
                  <span className="h-2 w-full rounded-full bg-slate-800 dark:bg-slate-300" />
                </span>
                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                  {k.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
