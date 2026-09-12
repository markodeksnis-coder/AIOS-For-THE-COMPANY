"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DeliveryTabs({
  blockedCount,
  clientCount,
  unassignedCount,
}: {
  blockedCount: number;
  clientCount: number;
  unassignedCount: number;
}) {
  const pathname = usePathname();

  const tabs = [
    { href: "/delivery", label: "Today", count: blockedCount, crit: true, match: (p: string) => p === "/delivery" },
    { href: "/delivery/clients", label: "Clients", count: clientCount, crit: false, match: (p: string) => p.startsWith("/delivery/clients") },
    { href: "/delivery/journey", label: "Journey", count: 0, crit: false, match: (p: string) => p.startsWith("/delivery/journey") },
    { href: "/delivery/assign", label: "Assign system", count: unassignedCount, crit: true, match: (p: string) => p.startsWith("/delivery/assign") },
  ];

  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {tabs.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-[0.83rem] font-bold transition-colors ${
              active ? "border-accent text-foreground" : "border-transparent text-text-faint hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`rounded-md px-1.5 py-0 font-mono text-[0.62rem] font-bold ${
                  t.crit ? "bg-critical/20 text-critical" : "bg-surface-2 text-text-dim"
                }`}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
