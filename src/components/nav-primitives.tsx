import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.83rem] font-semibold text-text-dim transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {Icon && <Icon size={15} strokeWidth={2} className="shrink-0 opacity-80" />}
      <span className="flex-1">{children}</span>
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

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
      {children}
    </div>
  );
}
