import type { HubService, ServiceState } from "@/lib/services";
import type { Health } from "@/lib/health";

const stateStyles: Record<ServiceState, { label: string; className: string }> = {
  active: {
    label: "active",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  off: {
    label: "off",
    className:
      "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  deferred: {
    label: "deferred",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  },
  future: {
    label: "future",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  },
};

const healthDot: Record<Health, { className: string; title: string }> = {
  up: { className: "bg-emerald-500", title: "reachable" },
  down: { className: "bg-rose-500", title: "unreachable" },
  unknown: { className: "bg-slate-400", title: "not probed" },
};

export function ServiceCard({
  service,
  health,
  latencyMs,
}: {
  service: HubService;
  health?: Health;
  latencyMs?: number | null;
}) {
  const badge = stateStyles[service.state];
  const interactive = Boolean(service.href) && service.state === "active";
  const dot = health ? healthDot[health] : null;

  const inner = (
    <div
      className={`flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition dark:border-slate-800 dark:bg-slate-900 ${
        interactive
          ? "hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700"
          : ""
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {dot && (
              <span
                aria-label={dot.title}
                title={dot.title}
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dot.className}`}
              />
            )}
            <h3 className="font-semibold">{service.name}</h3>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {service.description}
        </p>
      </div>
      {service.href && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="truncate text-xs font-mono text-slate-400">
            {service.href}
          </span>
          {health === "up" && typeof latencyMs === "number" && (
            <span className="shrink-0 text-xs text-slate-400">{latencyMs}ms</span>
          )}
        </div>
      )}
    </div>
  );

  if (interactive) {
    return (
      <a href={service.href} target="_blank" rel="noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return inner;
}
