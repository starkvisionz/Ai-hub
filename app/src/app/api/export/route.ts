import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { exportMemory, type MemoryEntry } from "@/lib/memory";

export const dynamic = "force-dynamic";

// GET /api/export?format=json|csv&q=&kind=&agent= — download the (filtered)
// shared brain. Handy for backups, migrations, or feeding another tool.

function csvField(v: string): string {
  let s = v;
  // Guard against CSV/formula injection: a leading =, +, -, @, tab or CR makes
  // spreadsheet apps treat the cell as a formula. Neutralize with a leading '.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  // Quote and escape per RFC 4180 when needed.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: MemoryEntry[]): string {
  const header = "id,created_at,agent,kind,content";
  const lines = rows.map((r) =>
    [
      String(r.id),
      new Date(r.created_at).toISOString(),
      csvField(r.agent),
      csvField(r.kind),
      csvField(r.content),
    ].join(","),
  );
  return [header, ...lines].join("\r\n");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "json").toLowerCase();
  const rows = await exportMemory({
    q: searchParams.get("q") ?? undefined,
    kind: searchParams.get("kind") ?? undefined,
    agent: searchParams.get("agent") ?? undefined,
  });

  if (rows === null) {
    return NextResponse.json(
      { available: false, reason: isDbConfigured() ? "db_unreachable" : "db_not_configured" },
      { status: 503 },
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="hub-brain-${stamp}.csv"`,
      },
    });
  }
  return new NextResponse(JSON.stringify({ exported_at: new Date().toISOString(), count: rows.length, entries: rows }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="hub-brain-${stamp}.json"`,
    },
  });
}
