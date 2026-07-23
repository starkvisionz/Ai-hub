import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { recentMemory, type MemoryEntry } from "@/lib/memory";

export const dynamic = "force-dynamic";

// GET /api/feed?format=json|rss&kind=&agent= — recent shared-brain entries as a
// subscribable feed for external readers (dashboards, readers, other agents).

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function title(e: MemoryEntry): string {
  const t = e.content.replace(/\s+/g, " ").trim();
  return t.length > 80 ? `${t.slice(0, 77)}…` : t || "(empty)";
}

function toRss(rows: MemoryEntry[], self: string): string {
  const items = rows
    .map(
      (e) => `    <item>
      <title>${xmlEscape(`[${e.agent}/${e.kind}] ${title(e)}`)}</title>
      <description>${xmlEscape(e.content)}</description>
      <guid isPermaLink="false">hub-memory-${e.id}</guid>
      <pubDate>${new Date(e.created_at).toUTCString()}</pubDate>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AI Hub — shared brain</title>
    <link>${xmlEscape(self)}</link>
    <description>Recent context written to the hub</description>
${items}
  </channel>
</rss>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const rows = await recentMemory({
    limit: 50,
    kind: url.searchParams.get("kind") ?? undefined,
    agent: url.searchParams.get("agent") ?? undefined,
  });

  if (rows === null) {
    return NextResponse.json(
      { available: false, reason: isDbConfigured() ? "db_unreachable" : "db_not_configured" },
      { status: 503 },
    );
  }

  const self = `${url.origin}${url.pathname}${url.search}`;

  if (format === "rss") {
    return new NextResponse(toRss(rows, self), {
      headers: { "content-type": "application/rss+xml; charset=utf-8" },
    });
  }

  // JSON Feed 1.1 (https://www.jsonfeed.org/version/1.1/)
  return NextResponse.json(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: "AI Hub — shared brain",
      description: "Recent context written to the hub",
      feed_url: self,
      items: rows.map((e) => ({
        id: `hub-memory-${e.id}`,
        title: `[${e.agent}/${e.kind}] ${title(e)}`,
        content_text: e.content,
        date_published: new Date(e.created_at).toISOString(),
        tags: [e.agent, e.kind, ...(e.pinned ? ["pinned"] : [])],
      })),
    },
    { headers: { "content-type": "application/feed+json; charset=utf-8" } },
  );
}
