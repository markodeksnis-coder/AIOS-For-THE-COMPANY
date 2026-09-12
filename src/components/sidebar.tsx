import Link from "next/link";
import {
  Home,
  LayoutDashboard,
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
  CircleDot,
  Smile,
  MoreVertical,
  Compass,
} from "lucide-react";
import { db } from "@/lib/db";
import { NavLink, Eyebrow } from "@/components/nav-primitives";
import { DepartmentNav } from "@/components/department-nav";
import { blockedList, CALL_TARGET, toDeliveryClientData, todayISO } from "@/lib/delivery";

export async function Sidebar() {
  const [departments, deliveryRows] = await Promise.all([
    db.brainFile.findMany({ where: { type: "department" } }),
    db.deliveryClient.findMany(),
  ]);
  const rows = departments.map((d) => ({ slug: d.slug, department: d.department ?? "" }));

  const deliveryClients = deliveryRows.map(toDeliveryClientData);
  const today = todayISO();
  const blockedCount = blockedList(deliveryClients, today).length;
  const unassignedCount = deliveryClients.filter((c) => !c.system).length;
  const delivered = deliveryClients.reduce((s, c) => s + c.delivered, 0);
  const committed = deliveryClients.filter((c) => c.system).length * CALL_TARGET;
  const deliveryProgress = committed > 0 ? Math.min(100, (delivered / committed) * 100) : 0;

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
          style={{ borderLeft: "2px solid var(--graph-knowledge)", backgroundColor: "color-mix(in srgb, var(--graph-knowledge) 7%, transparent)" }}
        >
          <Eyebrow accent="var(--graph-knowledge)">Delivery</Eyebrow>
          <NavLink href="/delivery" icon={CircleDot} badge={{ count: blockedCount, tone: "crit" }}>
            Today
          </NavLink>
          <NavLink href="/delivery/clients" icon={Smile} badge={{ count: deliveryClients.length }}>
            Clients
          </NavLink>
          <NavLink href="/delivery/journey" icon={MoreVertical}>
            Journey
          </NavLink>
          <NavLink href="/delivery/assign" icon={Compass} badge={{ count: unassignedCount, tone: "crit" }}>
            Assign system
          </NavLink>
        </div>

        <div
          className="flex flex-col gap-0.5 rounded-lg py-1.5 pl-2 pr-1"
          style={{ borderLeft: "2px solid var(--graph-people)", backgroundColor: "color-mix(in srgb, var(--graph-people) 6%, transparent)" }}
        >
          <Eyebrow accent="var(--graph-people)">Work</Eyebrow>
          <NavLink href="/dashboard" icon={LayoutDashboard}>Dashboard</NavLink>
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

      {committed > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
          <span className="font-mono text-[0.62rem] uppercase tracking-wide text-text-faint">Calls delivered</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-[1.05rem] font-bold">{delivered}</span>
            <span className="font-mono text-[0.7rem] text-text-faint">/ {committed} committed</span>
          </div>
          <div className="h-[5px] overflow-hidden rounded-sm bg-surface-2">
            <div
              className="h-full rounded-sm"
              style={{ width: `${deliveryProgress.toFixed(1)}%`, backgroundImage: "linear-gradient(90deg,#6366F1,#14B8A6)" }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-0.5 border-t border-border pt-2">
        <NavLink href="/" icon={Home}>Home</NavLink>
        <NavLink href="/settings" icon={SettingsIcon}>Settings</NavLink>
      </div>
    </nav>
  );
}
