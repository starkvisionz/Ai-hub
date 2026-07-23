import type { HubService, ServiceState } from "@/lib/services";

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
    className:
      "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  },
};

export function ServiceCard({ service }: { service: HubService }) {
  const badge = stateStyles[service.state];
  const interactive = Boolean(service.href) && service.state === "active";

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
          <h3 className="font-semibold">{service.name}</h3>
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
        <span className="mt-4 truncate text-xs font-mono text-slate-400">
          {service.href}
        </span>
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
