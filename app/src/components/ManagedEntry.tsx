"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MemoryEntry } from "@/lib/memory";
import { timeAgo } from "@/lib/time";

// A shared-brain entry with inline edit + delete. Used on /brain (manageable).
export function ManagedEntry({ entry }: { entry: MemoryEntry }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [kind, setKind] = useState(entry.kind);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    const md = `- **${entry.agent}** _(${entry.kind})_: ${entry.content}`;
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard unavailable (e.g. non-secure context) — ignore
    }
  }

  async function togglePin() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/memory?id=${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned: !entry.pinned }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (busy || !content.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/memory?id=${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, kind }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/memory?id=${entry.id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono dark:bg-slate-800">
          {entry.agent}
        </span>
        {editing ? (
          <input
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-24 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 dark:border-slate-700 dark:bg-slate-950"
          />
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
            {entry.kind}
          </span>
        )}
        <span className="ml-auto">{timeAgo(entry.created_at)}</span>
        {editing ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={busy || !content.trim()}
              className="rounded px-1 text-emerald-600 hover:text-emerald-500 disabled:opacity-40"
            >
              save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setContent(entry.content);
                setKind(entry.kind);
              }}
              className="rounded px-1 text-slate-400 hover:text-slate-600"
            >
              cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={togglePin}
              disabled={busy}
              className={`rounded px-1 disabled:opacity-40 ${
                entry.pinned
                  ? "text-amber-500 hover:text-amber-600"
                  : "text-slate-300 hover:text-amber-500 dark:text-slate-600"
              }`}
              aria-label={entry.pinned ? "Unpin entry" : "Pin entry"}
              title={entry.pinned ? "Unpin entry" : "Pin entry"}
            >
              {entry.pinned ? "★" : "☆"}
            </button>
            <button
              type="button"
              onClick={copyMarkdown}
              className="rounded px-1 text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300"
              aria-label="Copy as markdown"
              title="Copy as markdown"
            >
              {copied ? "copied" : "copy"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded px-1 text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300"
              aria-label="Edit entry"
              title="Edit entry"
            >
              edit
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded px-1 text-slate-300 hover:text-rose-500 disabled:opacity-40 dark:text-slate-600 dark:hover:text-rose-400"
              aria-label="Delete entry"
              title="Delete entry"
            >
              ×
            </button>
          </>
        )}
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-950"
        />
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
          {entry.content}
        </p>
      )}
    </li>
  );
}
