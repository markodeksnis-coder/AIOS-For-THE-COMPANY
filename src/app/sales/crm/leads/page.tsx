import Link from "next/link";
import { db } from "@/lib/db";
import { NewLeadForm } from "@/components/crm/new-lead-form";
import { CsvImport } from "@/components/crm/csv-import";
import { LeadsTable, type LeadTableRow } from "@/components/crm/leads-table";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      source: true,
      stage: true,
      repName: true,
      notes: true,
      createdAt: true,
    },
  });

  const rows: LeadTableRow[] = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString().slice(0, 10),
  }));

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Sales · Inside Sales
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Leads</h1>
        <p className="mt-1 max-w-[65ch] text-[0.88rem] text-text-dim">
          Every contact in the CRM — search, filter, add one, or import a batch from a CSV.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to CRM
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <NewLeadForm />
        <CsvImport />
      </div>

      <LeadsTable rows={rows} />
    </div>
  );
}
