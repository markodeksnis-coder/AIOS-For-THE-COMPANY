import Link from "next/link";
import { db } from "@/lib/db";
import { SettingsForm } from "@/components/settings-form";
import { Card } from "@/components/ui/card";

export default async function SettingsPage() {
  const departments = await db.brainFile.findMany({ where: { type: "department" } });
  const rows = departments.map((d) => ({ slug: d.slug, department: d.department ?? "" }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Settings
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Display preferences</h1>
        <p className="mt-1 max-w-[56ch] text-[0.88rem] text-text-dim">
          These are saved in this browser only — there&apos;s no login yet, so they&apos;re not
          shared across devices.
        </p>
      </div>
      <SettingsForm departments={rows} />

      <div className="mt-8 border-t border-border pt-8">
        <h2 className="mb-3 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-text-faint">
          Integrations
        </h2>
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.86rem] font-bold">CRM webhook log</div>
              <p className="mt-0.5 text-[0.78rem] text-text-dim">
                Fathom and Calendly delivery history, connection status, and the &ldquo;fire a test
                event&rdquo; tool — day-to-day noise, not something you need in the CRM&apos;s main nav.
              </p>
            </div>
            <Link
              href="/sales/crm/webhooks"
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-[0.78rem] font-semibold text-text-dim transition-colors hover:border-accent hover:text-foreground"
            >
              Open →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
