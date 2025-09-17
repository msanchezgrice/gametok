import type { ReactNode } from "react";
import { TabsNav } from "./tabs-nav";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col bg-[color:var(--background)] text-[color:var(--foreground)]">
      <main className="flex-1 overflow-hidden">{children}</main>
      <TabsNav />
    </div>
  );
}
