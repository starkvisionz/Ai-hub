// 14-day activity sparkline. Fills missing days with 0 so gaps read correctly.
// Pure SVG — no chart library (CSP-safe, tiny). Server component.

function last14Days(): string[] {
  const days: string[] = [];
  const now = Date.now();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function Sparkline({
  perDay,
}: {
  perDay: { day: string; count: number }[];
}) {
  const counts = new Map(perDay.map((d) => [d.day, d.count]));
  const days = last14Days();
  const series = days.map((d) => counts.get(d) ?? 0);
  const max = Math.max(1, ...series);
  const total = series.reduce((a, b) => a + b, 0);

  const W = 320;
  const H = 40;
  const gap = 3;
  const barW = (W - gap * (series.length - 1)) / series.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          activity · last 14 days
        </span>
        <span className="text-xs text-slate-400">{total} entries</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-10 w-full"
        role="img"
        aria-label={`Activity over the last 14 days, ${total} entries total`}
        preserveAspectRatio="none"
      >
        {series.map((v, i) => {
          const h = v === 0 ? 1 : Math.max(2, (v / max) * H);
          return (
            <rect
              key={days[i]}
              x={i * (barW + gap)}
              y={H - h}
              width={barW}
              height={h}
              rx={1}
              className="fill-slate-800 dark:fill-slate-300"
            >
              <title>{`${days[i]}: ${v}`}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
