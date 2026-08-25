import Link from "next/link";
import { db } from "@/lib/db";
import { CrmBoard, type LeadRow } from "@/components/crm/crm-board";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const [leads, unmatchedCount] = await Promise.all([
    db.lead.findMany({ orderBy: { order: "asc" } }),
    db.unmatchedCall.count(),
  ]);

  const leadRows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    stage: l.stage,
    dealValue: l.dealValue,
    nextCallAt: l.nextCallAt ? l.nextCallAt.toISOString() : null,
    stageChangedAt: l.stageChangedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
            Sales · Inside Sales
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Pipeline</h1>
          <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
            One pipeline, Booked to Cash — everything built around show rate and close rate.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/sales/crm/dashboard"
            className="rounded-lg bg-accent px-3 py-2 text-[0.78rem] font-semibold text-on-accent transition-colors hover:bg-accent-strong"
          >
            Dashboard →
          </Link>
          <Link
            href="/sales/crm/leads"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Leads →
          </Link>
          <Link
            href="/sales/crm/debriefs"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Call debriefs →
          </Link>
          <Link
            href="/sales/crm/calls"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            All calls →
          </Link>
          <Link
            href="/sales/crm/unmatched"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Unmatched calls →
            {unmatchedCount > 0 && (
              <span className="rounded-full bg-critical px-1.5 py-0.5 font-mono text-[0.62rem] font-bold text-white">
                {unmatchedCount}
              </span>
            )}
          </Link>
          <Link
            href="/sales/crm/webhooks"
            className="rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
          >
            Webhooks →
          </Link>
        </div>
      </div>

      <CrmBoard leads={leadRows} />
    </div>
  );
}
