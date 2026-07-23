// Server-side liveness probing for the hub's services. Each service with a URL
// is pinged with a short timeout; we report up / down / unknown. Runs at request
// time (never at build) — see `dynamic` on the pages/routes that call it.

import { services, type HubService } from "./services";

export type Health = "up" | "down" | "unknown";

export type ServiceHealth = {
  name: string;
  health: Health;
  ms: number | null;
};

async function probe(url: string, timeoutMs = 1500): Promise<ServiceHealth["health"]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Any HTTP response (even 401/302) means the service is listening.
    await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "manual",
      cache: "no-store",
    });
    return "up";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

export async function checkService(service: HubService): Promise<ServiceHealth> {
  // Only probe things that are supposed to be running and reachable over HTTP.
  if (service.state !== "active" || !service.href) {
    return { name: service.name, health: "unknown", ms: null };
  }
  const start = Date.now();
  const health = await probe(service.href);
  return { name: service.name, health, ms: Date.now() - start };
}

export async function checkAll(): Promise<Record<string, ServiceHealth>> {
  const results = await Promise.all(services.map(checkService));
  return Object.fromEntries(results.map((r) => [r.name, r]));
}
