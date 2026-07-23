import { memoryStats } from "@/lib/memory";
import { timeAgo } from "@/lib/time";

// Compact stat tiles summarizing the shared brain. Silent (renders nothing) when
// there's no database, so the dashboard stays clean pre-DB.
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

  return (
    <div className="mb-10 grid grid-cols-3 gap-4">
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
  );
}
