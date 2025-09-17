"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import type { ReactElement } from "react";

const tabs = [
  {
    href: "/browse" as Route,
    label: "Home",
    icon: (active: boolean): ReactElement => (
      <svg viewBox="0 0 24 24" fill={active ? "white" : "none"} className="h-7 w-7">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/search" as Route,
    label: "Discover",
    icon: (active: boolean): ReactElement => (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
        <circle cx="11" cy="11" r="8" stroke="white" strokeWidth={active ? "3" : "2"} />
        <path d="M21 21l-4.35-4.35" stroke="white" strokeWidth={active ? "3" : "2"} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/profile" as Route,
    label: "Profile",
    icon: (active: boolean): ReactElement => (
      <svg viewBox="0 0 24 24" fill={active ? "white" : "none"} className="h-7 w-7">
        <circle cx="12" cy="8" r="5" stroke="white" strokeWidth="2" />
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
] satisfies ReadonlyArray<{ href: Route; label: string; icon: (active: boolean) => ReactElement }>;

export function TabsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-around items-center bg-black/95 backdrop-blur-sm py-2 pb-safe border-t border-white/10">
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href) ||
                      (tab.href === "/profile" && (pathname?.startsWith("/favorites") || pathname?.startsWith("/settings")));

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 px-6 py-1 transition-all",
              active ? "text-white" : "text-white/60",
            )}
          >
            {tab.icon(active)}
            <span className="text-[11px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}