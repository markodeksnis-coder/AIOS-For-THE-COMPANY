import Link from "next/link";
import { db } from "@/lib/db";
import { CallsTable, type CallRow } from "@/components/crm/calls-table";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const calls = await db.salesCall.findMany({
    orderBy: { scheduledAt: "desc" },
    include: { lead: { select: { id: true, name: true } } },
    take: 20,
  });

  const rows: CallRow[] = calls.map((c) => ({
    id: c.id,
    leadId: c.lead.id,
    leadName: c.lead.name,
    scheduledAt: c.scheduledAt,
    startedAt: c.startedAt ? c.startedAt.toISOString() : null,
    rep: c.rep,
    callStatus: c.callStatus,
    result: c.result,
    cashCollected: c.cashCollected,
    notes: c.notes,
  }));

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Sales · Inside Sales
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Recent sales calls</h1>
        <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
          The last 20 calls logged, most recent first — filter by status, or click Edit to fix a mistake.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to CRM
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border px-4 py-6 text-center text-[0.83rem] text-text-faint">
          No calls logged yet.{" "}
          <Link href="/sales/crm" className="font-semibold text-accent-strong hover:underline">
            Use the Log a call button
          </Link>{" "}
          to add one, or connect Fathom/Calendly to have them land here automatically.
        </div>
      ) : (
        <CallsTable calls={rows} />
      )}
    </div>
  );
}
