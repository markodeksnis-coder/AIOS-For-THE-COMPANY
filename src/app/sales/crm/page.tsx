import Link from "next/link";
import { Phone, CalendarCheck, UserX, Trophy, DollarSign, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/icon-tile";
import { CrmBoard } from "@/components/crm/crm-board";
import { HotLeadsPanel } from "@/components/crm/hot-leads-panel";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [leads, totalCalls, bookedCount, noShowCount, closedCount, cashAgg, predictions] = await Promise.all([
    db.lead.findMany({
      orderBy: { order: "asc" },
      select: { id: true, name: true, source: true, stage: true, tags: true, cashCollected: true },
    }),
    db.salesCall.count(),
    db.lead.count({ where: { stage: "booked" } }),
    db.lead.count({ where: { stage: "no_show" } }),
    db.lead.count({ where: { stage: "closed" } }),
    db.lead.aggregate({ _sum: { cashCollected: true } }),
    db.hotLeadPrediction.findMany({
      orderBy: { rank: "asc" },
      include: { lead: { select: { id: true, name: true, stage: true, cashCollected: true } } },
    }),
  ]);

  const cashCollected = cashAgg._sum.cashCollected ?? 0;
  const refreshedAt = predictions[0]?.createdAt.toISOString() ?? null;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
            Sales · Inside Sales
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">CRM</h1>
          <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
            Every lead, every call, and what to do about each one — Head of Sales drafts the
            follow-ups, you send them.
          </p>
        </div>
        <Link
          href="/sales/crm/calls"
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
        >
          All calls →
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile icon={Phone} gradient="linear-gradient(135deg, #3B82F6, #14B8A6)" num={totalCalls} label="Total calls" />
        <StatTile icon={CalendarCheck} gradient="linear-gradient(135deg, #3B82F6, #60A5FA)" num={bookedCount} label="Booked" />
        <StatTile icon={UserX} gradient="linear-gradient(135deg, #EF4444, #F87171)" num={noShowCount} label="No-show" />
        <StatTile icon={Trophy} gradient="linear-gradient(135deg, #22C55E, #4ADE80)" num={closedCount} label="Closed" />
        <StatTile
          icon={DollarSign}
          gradient="linear-gradient(135deg, #EAB308, #FACC15)"
          num={cashCollected}
          label="Cash collected"
          isCurrency
        />
      </div>

      <HotLeadsPanel predictions={predictions} refreshedAt={refreshedAt} />

      <CrmBoard leads={leads} />
    </div>
  );
}

function StatTile({
  icon,
  gradient,
  num,
  label,
  isCurrency = false,
}: {
  icon: LucideIcon;
  gradient: string;
  num: number;
  label: string;
  isCurrency?: boolean;
}) {
  return (
    <Card className="h-full p-4">
      <IconTile icon={icon} gradient={gradient} size="sm" className="mb-2.5" />
      <div className="font-mono text-2xl tabular-nums">
        {isCurrency ? `$${num.toLocaleString()}` : num}
      </div>
      <div className="mt-0.5 text-[0.78rem] text-text-dim">{label}</div>
    </Card>
  );
}
