"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const tabs = [
  {
    href: "/browse",
    label: "Feed",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <rect x="3" y="3" width="18" height="18" rx="2"
          stroke="currentColor" strokeWidth={active ? "2.5" : "2"} />
        <rect x="8" y="8" width="8" height="8" rx="1"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth={active ? "0" : "1.5"} />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} />
        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth={active ? "2.5" : "2"} />
        <path d="M4 21v-2a4 4 0 014-4h8a4 4 0 014 4v2"
          stroke="currentColor" strokeWidth={active ? "2.5" : "2"} strokeLinecap="round" />
      </svg>
    ),
  },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: (active: boolean) => JSX.Element }>;

export function TabsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-around border-t border-black/20 bg-black py-2 safe-bottom">
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href) ||
                      (tab.href === "/profile" && pathname?.startsWith("/settings")) ||
                      (tab.href === "/profile" && pathname?.startsWith("/favorites"));

        return (
          <Link
            key={tab.href}
            href={tab.href === "/search" ? "/browse" : tab.href === "/profile" ? "/favorites" : tab.href}
            className={clsx(
              "flex flex-col items-center justify-center gap-0.5 px-8 py-1 transition-all",
              active ? "text-white" : "text-white/50",
            )}
          >
            {tab.icon(active)}
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}