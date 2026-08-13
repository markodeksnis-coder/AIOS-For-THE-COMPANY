import Link from "next/link";
import { db } from "@/lib/db";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[0.83rem] font-semibold text-text-dim transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function DisabledNavItem({ children, phase }: { children: React.ReactNode; phase: string }) {
  return (
    <div className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[0.83rem] font-semibold text-text-faint opacity-60">
      <span>{children}</span>
      <span className="rounded border border-border px-1 font-mono text-[0.58rem] uppercase tracking-wide">
        {phase}
      </span>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1 font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
      {children}
    </div>
  );
}

export async function Sidebar() {
  const departments = await db.brainFile.findMany({ where: { type: "department" } });
  const sorted = [...departments].sort(
    (a, b) =>
      DEPARTMENT_ORDER.indexOf(a.department ?? "") - DEPARTMENT_ORDER.indexOf(b.department ?? "")
  );

  return (
    <nav className="flex w-[232px] shrink-0 flex-col gap-5 border-r border-border bg-surface p-3.5">
      <Link href="/" className="flex items-center gap-2 px-1 pb-1">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-accent font-mono text-[0.7rem] text-on-accent">
          B&amp;F
        </span>
        <span className="text-[0.9rem] font-extrabold tracking-tight">Company OS</span>
      </Link>

      <div className="flex flex-col gap-0.5">
        <Eyebrow>Work</Eyebrow>
        <DisabledNavItem phase="phase 3">Inbox</DisabledNavItem>
        <DisabledNavItem phase="phase 3">Issues</DisabledNavItem>
        <DisabledNavItem phase="phase 3">Projects</DisabledNavItem>
        <DisabledNavItem phase="phase 4">Scorecards</DisabledNavItem>
      </div>

      <div className="flex flex-col gap-0.5">
        <Eyebrow>Company</Eyebrow>
        <NavLink href="/docs">Docs</NavLink>
        <DisabledNavItem phase="phase 2">Systems</DisabledNavItem>
        <NavLink href="/training">Training</NavLink>
        <NavLink href="/teams">Teams &amp; Members</NavLink>
        <NavLink href="/agents">Agents</NavLink>
      </div>

      <div className="flex flex-col gap-0.5">
        <Eyebrow>Departments</Eyebrow>
        {sorted.map((d) => (
          <NavLink key={d.slug} href={`/departments/${d.department}`}>
            {DEPARTMENT_LABELS[d.department ?? ""] ?? d.department}
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col gap-0.5">
        <Eyebrow>The Brain</Eyebrow>
        <NavLink href="/docs">Search</NavLink>
        <DisabledNavItem phase="phase 5">Graph</DisabledNavItem>
      </div>
    </nav>
  );
}
