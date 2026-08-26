import Link from "next/link";
import {
  Home,
  Inbox,
  ListTodo,
  FolderKanban,
  BarChart3,
  Phone,
  TrendingUp,
  Send,
  FileText,
  Workflow,
  GraduationCap,
  Users,
  Bot,
  Zap,
  Search,
  Share2,
  Settings as SettingsIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { NavLink, Eyebrow } from "@/components/nav-primitives";
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
          CO
        </span>
        <span className="text-[0.9rem] font-extrabold tracking-tight">Company OS</span>
      </Link>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        <div
          className="flex flex-col gap-0.5 rounded-lg py-1.5 pl-2 pr-1"
          style={{ borderLeft: "2px solid var(--graph-people)", backgroundColor: "color-mix(in srgb, var(--graph-people) 6%, transparent)" }}
        >
          <Eyebrow accent="var(--graph-people)">Work</Eyebrow>
          <NavLink href="/inbox" icon={Inbox}>Inbox</NavLink>
          <NavLink href="/issues" icon={ListTodo}>Issues</NavLink>
          <NavLink href="/projects" icon={FolderKanban}>Projects</NavLink>
          <NavLink href="/scorecards" icon={BarChart3}>Scorecards</NavLink>
          <NavLink href="/sales/crm" icon={Phone}>Inside Sales CRM</NavLink>
          <NavLink href="/sales/crm/dashboard" icon={TrendingUp}>Sales KPI</NavLink>
          <NavLink href="/sales/crm/follow-ups" icon={Send}>Follow-ups</NavLink>
        </div>

        <div
          className="flex flex-col gap-0.5 rounded-lg py-1.5 pl-2 pr-1"
          style={{ borderLeft: "2px solid var(--graph-knowledge)", backgroundColor: "color-mix(in srgb, var(--graph-knowledge) 6%, transparent)" }}
        >
          <Eyebrow accent="var(--graph-knowledge)">Company</Eyebrow>
          <NavLink href="/docs" icon={FileText}>Docs</NavLink>
          <NavLink href="/systems" icon={Workflow}>Systems</NavLink>
          <NavLink href="/training" icon={GraduationCap}>Training</NavLink>
          <NavLink href="/teams" icon={Users}>Teams &amp; Members</NavLink>
          <NavLink href="/agents" icon={Bot}>Agents</NavLink>
          <NavLink href="/activity" icon={Zap}>Activity</NavLink>
        </div>

        <div className="flex flex-col gap-0.5">
          <Eyebrow>Departments</Eyebrow>
          <DepartmentNav departments={rows} />
        </div>

        <div
          className="flex flex-col gap-0.5 rounded-lg py-1.5 pl-2 pr-1"
          style={{ borderLeft: "2px solid var(--graph-work)", backgroundColor: "color-mix(in srgb, var(--graph-work) 6%, transparent)" }}
        >
          <Eyebrow accent="var(--graph-work)">The Brain</Eyebrow>
          <NavLink href="/docs" icon={Search}>Search</NavLink>
          <NavLink href="/graph" icon={Share2}>Graph</NavLink>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border pt-2">
        <NavLink href="/" icon={Home}>Home</NavLink>
        <NavLink href="/settings" icon={SettingsIcon}>Settings</NavLink>
      </div>
    </nav>
  );
}
