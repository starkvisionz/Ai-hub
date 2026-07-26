import { ServiceCard } from "@/components/ServiceCard";
import { MemoryPanel } from "@/components/MemoryPanel";
import { StatRow } from "@/components/StatRow";
import { LiveRefresh } from "@/components/LiveRefresh";
import { services, type HubService } from "@/lib/services";
import { checkAll } from "@/lib/health";

// Rendered per-request so health probes + brain reads reflect live state.
export const dynamic = "force-dynamic";

const groups: HubService["group"][] = ["Infrastructure", "Automation & AI"];

export default async function Home() {
  const health = await checkAll();
  const activeCount = services.filter((s) => s.state === "active").length;
  const upCount = Object.values(health).filter((h) => h.health === "up").length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <LiveRefresh seconds={20} />
      <header className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Control surface for the self-hosted multi-AI workspace.
        </p>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {upCount}/{activeCount} active services reachable · Claude is the
          primary model · access gated behind Tailscale.
        </p>
      </header>

      <StatRow />

      {groups.map((group) => (
        <section key={group} className="mb-10">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {group}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services
              .filter((s) => s.group === group)
              .map((service) => (
                <ServiceCard
                  key={service.name}
                  service={service}
                  health={health[service.name]?.health}
                  latencyMs={health[service.name]?.ms}
                />
              ))}
          </div>
        </section>
      ))}

      <MemoryPanel />

      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-slate-800">
        AI Hub · see <span className="font-mono">HANDOFF.md</span> for live state ·{" "}
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
