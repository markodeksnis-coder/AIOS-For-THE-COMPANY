import Link from "next/link";
import {
  Home,
  Inbox,
  ListTodo,
  FolderKanban,
  BarChart3,
  FileText,
  Workflow,
  GraduationCap,
  Users,
  Bot,
  Search,
  Share2,
  Settings as SettingsIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { NavLink, DisabledNavItem, Eyebrow } from "@/components/nav-primitives";
import { DepartmentNav } from "@/components/department-nav";

export async function Sidebar() {
  const departments = await db.brainFile.findMany({ where: { type: "department" } });
  const rows = departments.map((d) => ({ slug: d.slug, department: d.department ?? "" }));

  return (
    <nav className="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col gap-5 border-r border-border bg-surface p-3.5 backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2 px-1 pb-1">
        <span
          className="flex h-[26px] w-[26px] items-center justify-center rounded-lg font-mono text-[0.7rem] font-bold text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.6)]"
          style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #14B8A6)" }}
        >
          B&amp;F
        </span>
        <span className="text-[0.9rem] font-extrabold tracking-tight">Company OS</span>
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          <Eyebrow>Work</Eyebrow>
          <DisabledNavItem icon={Inbox} phase="phase 3">Inbox</DisabledNavItem>
          <DisabledNavItem icon={ListTodo} phase="phase 3">Issues</DisabledNavItem>
          <DisabledNavItem icon={FolderKanban} phase="phase 3">Projects</DisabledNavItem>
          <DisabledNavItem icon={BarChart3} phase="phase 4">Scorecards</DisabledNavItem>
        </div>

        <div className="flex flex-col gap-0.5">
          <Eyebrow>Company</Eyebrow>
          <NavLink href="/docs" icon={FileText}>Docs</NavLink>
          <DisabledNavItem icon={Workflow} phase="phase 2">Systems</DisabledNavItem>
          <NavLink href="/training" icon={GraduationCap}>Training</NavLink>
          <NavLink href="/teams" icon={Users}>Teams &amp; Members</NavLink>
          <NavLink href="/agents" icon={Bot}>Agents</NavLink>
        </div>

        <div className="flex flex-col gap-0.5">
          <Eyebrow>Departments</Eyebrow>
          <DepartmentNav departments={rows} />
        </div>

        <div className="flex flex-col gap-0.5">
          <Eyebrow>The Brain</Eyebrow>
          <NavLink href="/docs" icon={Search}>Search</NavLink>
          <DisabledNavItem icon={Share2} phase="phase 5">Graph</DisabledNavItem>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border pt-2">
        <NavLink href="/" icon={Home}>Home</NavLink>
        <NavLink href="/settings" icon={SettingsIcon}>Settings</NavLink>
      </div>
    </nav>
  );
}
