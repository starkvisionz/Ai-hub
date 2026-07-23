import { ServiceCard } from "@/components/ServiceCard";
import { services, type HubService } from "@/lib/services";

const groups: HubService["group"][] = ["Infrastructure", "Automation & AI"];

export default function Home() {
  const activeCount = services.filter((s) => s.state === "active").length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-10 w-10 place-items-center rounded-lg bg-slate-900 text-lg font-bold text-white dark:bg-white dark:text-slate-900"
          >
            ▲
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Hub</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Control surface for the self-hosted multi-AI workspace.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {activeCount} services active · Claude is the primary model · access
          gated behind Tailscale.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group} className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services
              .filter((s) => s.group === group)
              .map((service) => (
                <ServiceCard key={service.name} service={service} />
              ))}
          </div>
        </section>
      ))}

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-800">
        AI Hub · see{" "}
        <span className="font-mono">HANDOFF.md</span> for live state ·{" "}
        <a
          className="underline hover:text-slate-600 dark:hover:text-slate-300"
          href="/api/health"
        >
          health
        </a>
      </footer>
    </main>
  );
}
