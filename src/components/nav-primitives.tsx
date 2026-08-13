import Link from "next/link";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[0.83rem] font-semibold text-text-dim transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export function DisabledNavItem({
  children,
  phase,
}: {
  children: React.ReactNode;
  phase: string;
}) {
  return (
    <div className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[0.83rem] font-semibold text-text-faint opacity-60">
      <span>{children}</span>
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
