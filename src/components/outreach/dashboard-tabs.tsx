import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/outbound", label: "Cold Outbound" },
  { href: "/dashboard/appointments", label: "Appointment Reporting" },
] as const;

export function DashboardTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "border-b-2 px-3 pb-2.5 text-[0.83rem] font-semibold transition-colors",
            tab.href === active
              ? "border-accent text-foreground"
              : "border-transparent text-text-faint hover:text-text-dim"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
