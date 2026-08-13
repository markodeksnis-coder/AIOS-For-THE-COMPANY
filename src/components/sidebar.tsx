import Link from "next/link";
import { db } from "@/lib/db";
import { NavLink, DisabledNavItem, Eyebrow } from "@/components/nav-primitives";
import { DepartmentNav } from "@/components/department-nav";

export async function Sidebar() {
  const departments = await db.brainFile.findMany({ where: { type: "department" } });
  const rows = departments.map((d) => ({ slug: d.slug, department: d.department ?? "" }));

  return (
    <nav className="sticky top-0 flex h-screen w-[232px] shrink-0 flex-col gap-5 border-r border-border bg-surface p-3.5">
      <Link href="/" className="flex items-center gap-2 px-1 pb-1">
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-accent font-mono text-[0.7rem] text-on-accent">
          B&amp;F
        </span>
        <span className="text-[0.9rem] font-extrabold tracking-tight">Company OS</span>
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
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
          <DepartmentNav departments={rows} />
        </div>

        <div className="flex flex-col gap-0.5">
          <Eyebrow>The Brain</Eyebrow>
          <NavLink href="/docs">Search</NavLink>
          <DisabledNavItem phase="phase 5">Graph</DisabledNavItem>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border pt-2">
        <NavLink href="/settings">
          <span className="flex items-center gap-1.5">
            <SettingsIcon /> Settings
          </span>
        </NavLink>
      </div>
    </nav>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 2v1.4M8 12.6V14M14 8h-1.4M3.4 8H2M12.1 3.9l-1 1M4.9 11.1l-1 1M12.1 12.1l-1-1M4.9 4.9l-1-1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
