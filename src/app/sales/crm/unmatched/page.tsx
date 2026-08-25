import Link from "next/link";
import { db } from "@/lib/db";
import { UnmatchedCallsTable, type UnmatchedCallRow } from "@/components/crm/unmatched-calls-table";
import { formatCET } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function UnmatchedCallsPage() {
  const [unmatched, leads] = await Promise.all([
    db.unmatchedCall.findMany({ orderBy: { createdAt: "desc" } }),
    db.lead.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows: UnmatchedCallRow[] = unmatched.map((c) => ({
    id: c.id,
    source: c.source,
    attendeeEmail: c.attendeeEmail,
    attendeeName: c.attendeeName,
    attendeePhone: c.attendeePhone,
    scheduledAt: c.scheduledAt,
    aiSummary: c.aiSummary,
    recordingLink: c.recordingLink,
    createdAtLabel: formatCET(c.createdAt),
  }));

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Sales · Inside Sales
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Unmatched calls</h1>
        <p className="mt-1 max-w-[65ch] text-[0.88rem] text-text-dim">
          A recording or booking landed with a verified signature but matched no lead by email, phone, or name —
          held here instead of being dropped. Assign it to the right lead, or dismiss it if it isn&rsquo;t a real
          sales call.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to CRM
        </Link>
      </div>

      <UnmatchedCallsTable calls={rows} leads={leads} />
    </div>
  );
}
