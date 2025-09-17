"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const tabs = [
  { href: "/browse", label: "Browse" },
  { href: "/favorites", label: "Favorites" },
  { href: "/settings", label: "Settings" },
];

export function TabsNav() {
  const pathname = usePathname();

  return (
    <nav className="grid grid-cols-3 border-t border-white/10 bg-[color:var(--surface)]/80 text-xs uppercase tracking-wide backdrop-blur">
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 py-3 text-[0.75rem] transition-colors",
              active ? "text-white" : "text-[color:var(--muted)]",
            )}
          >
            <span
              className={clsx(
                "h-1 w-8 rounded-full",
                active ? "bg-[color:var(--accent)]" : "bg-transparent",
              )}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
