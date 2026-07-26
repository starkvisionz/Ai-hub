"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/brain", label: "Brain" },
];

// Slim persistent header rendered on every page (see layout.tsx).
export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <nav className="mx-auto flex max-w-5xl items-center gap-5 px-6 py-3 text-sm">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900"
          >
            ▲
          </span>
          AI Hub
        </Link>
        {links.map((l) => {
          const active =
            l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "font-medium text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }
            >
              {l.label}
            </Link>
          );
        })}
        <a
          href="/api/health"
          className="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          health
        </a>
      </nav>
    </header>
  );
}
