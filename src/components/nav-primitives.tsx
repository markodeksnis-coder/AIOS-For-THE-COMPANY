import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function NavLink({
  href,
  icon: Icon,
  badge,
  children,
}: {
  href: string;
  icon?: LucideIcon;
  /** A small count pill at the end of the row — e.g. blocked gates,
   *  unassigned clients. `tone: "crit"` tints it red for "needs attention". */
  badge?: { count: number; tone?: "crit" | "default" };
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.83rem] font-semibold text-text-dim transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {Icon && <Icon size={15} strokeWidth={2} className="shrink-0 opacity-80" />}
      <span className="flex-1">{children}</span>
      {badge && badge.count > 0 && (
        <span
          className={`rounded-md px-1.5 py-0 font-mono text-[0.62rem] font-bold ${
            badge.tone === "crit" ? "bg-critical/20 text-critical" : "bg-surface-2 text-text-dim"
          }`}
        >
          {badge.count}
        </span>
      )}
    </Link>
  );
}

export function DisabledNavItem({
  children,
  icon: Icon,
  phase,
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
  phase: string;
}) {
  return (
    <div className="flex cursor-not-allowed items-center gap-2 rounded-lg px-2 py-1.5 text-[0.83rem] font-semibold text-text-faint opacity-50">
      {Icon && <Icon size={15} strokeWidth={2} className="shrink-0" />}
      <span className="flex-1">{children}</span>
      <span className="rounded border border-border px-1 font-mono text-[0.58rem] uppercase tracking-wide">
        {phase}
      </span>
    </div>
  );
}

/** `accent`, when passed, tints the label and adds a small dot — the
 *  sidebar's way of giving each nav group (Work/Company/The Brain) its
 *  own identity so groups read as distinct sections, not one undifferentiated
 *  list. Omit it for a group that doesn't need its own color (Departments
 *  already carries per-department color on each row). */
export function Eyebrow({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2 pb-1 font-mono text-[0.6875rem] uppercase tracking-widest"
      style={{ color: accent ?? "var(--text-faint)" }}
    >
      {accent && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />}
      {children}
    </div>
  );
}
