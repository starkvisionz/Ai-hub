import Link from "next/link";
import { getMemory, linksFor } from "@/lib/memory";
import { LinkComposer } from "@/components/LinkComposer";
import { RemoveLinkButton } from "@/components/RemoveLinkButton";
import { LiveRefresh } from "@/components/LiveRefresh";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  const [entry, related] = await Promise.all([
    Number.isInteger(id) && id > 0 ? getMemory(id) : Promise.resolve(null),
    Number.isInteger(id) && id > 0 ? linksFor(id) : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <LiveRefresh seconds={30} />

      <Link
        href="/brain"
        className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
      >
        ← shared brain
      </Link>

      {entry === null ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Entry not found (or no database connected).
        </p>
      ) : (
        <>
          <article className="mt-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {entry.pinned && <span className="text-amber-500">★</span>}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
                {entry.agent}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                {entry.kind}
              </span>
              <span className="ml-auto">
                #{entry.id} · {timeAgo(entry.created_at)}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
              {entry.content}
            </p>
          </article>

          <section className="mt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              related ({related?.length ?? 0})
            </h2>

            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <LinkComposer fromId={entry.id} />
            </div>

            {related && related.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {related.map((r) => (
                  <li
                    key={r.link_id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      className="mt-0.5 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      title={r.direction === "out" ? "outgoing" : "incoming"}
                    >
                      {r.direction === "out" ? "→" : "←"} {r.rel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/brain/${r.entry.id}`}
                        className="block truncate text-sm text-slate-700 hover:underline dark:text-slate-300"
                      >
                        {r.entry.content}
                      </Link>
                      <span className="text-xs text-slate-400">
                        #{r.entry.id} · {r.entry.agent}/{r.entry.kind}
                      </span>
                    </div>
                    <RemoveLinkButton linkId={r.link_id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No links yet. Add one above by entry id.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
