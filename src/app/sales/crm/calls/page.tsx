import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { CALL_OUTCOME_LABELS, LEAD_STAGE_STYLE } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const calls = await db.salesCall.findMany({
    orderBy: { scheduledAt: "desc" },
    include: { lead: { select: { id: true, name: true } } },
    take: 200,
  });

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Sales · Inside Sales
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">All sales calls</h1>
        <p className="mt-1 max-w-[60ch] text-[0.88rem] text-text-dim">
          Every call ever logged, most recent first — {calls.length} total.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to CRM
        </Link>
      </div>

      <Card className="overflow-hidden">
        {calls.length === 0 && (
          <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">
            No calls logged yet — log one from a lead&apos;s page.
          </div>
        )}
        {calls.map((c) => {
          const style = LEAD_STAGE_STYLE[c.outcome as keyof typeof LEAD_STAGE_STYLE];
          return (
            <Link
              key={c.id}
              href={`/sales/crm/${c.leadId}`}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
            >
              <span className="font-mono text-[0.72rem] text-text-faint">{c.scheduledAt}</span>
              <span className="flex-1 truncate font-bold">{c.lead.name}</span>
              {c.cashCollected ? (
                <span className="font-mono text-[0.72rem] font-bold text-good">
                  ${c.cashCollected.toLocaleString()}
                </span>
              ) : null}
              {c.notes && <span className="hidden truncate text-text-faint sm:block sm:max-w-[240px]">{c.notes}</span>}
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold"
                style={{ backgroundColor: style?.wash ?? "var(--surface-2)", color: style?.text ?? "var(--text-faint)" }}
              >
                {CALL_OUTCOME_LABELS[c.outcome as keyof typeof CALL_OUTCOME_LABELS] ?? c.outcome}
              </span>
            </Link>
          );
        })}
      </Card>
    </div>
  );
}
