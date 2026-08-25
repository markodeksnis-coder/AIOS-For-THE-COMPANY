import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { FireTestEventPanel } from "@/components/crm/fire-test-event-panel";
import { formatCET } from "@/lib/crm";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { wash: string; text: string; label: string }> = {
  processed: { wash: "var(--good-wash)", text: "var(--good)", label: "Processed" },
  unmatched: { wash: "var(--warn-wash)", text: "var(--warn)", label: "Unmatched" },
  ignored: { wash: "var(--surface-2)", text: "var(--text-faint)", label: "Ignored" },
  invalid_signature: { wash: "rgba(214,72,62,0.12)", text: "var(--critical)", label: "Invalid signature" },
  error: { wash: "rgba(214,72,62,0.12)", text: "var(--critical)", label: "Error" },
};

export default async function WebhooksPage() {
  const [events, leads] = await Promise.all([
    db.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.lead.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Sales · Inside Sales
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Webhook log</h1>
        <p className="mt-1 max-w-[65ch] text-[0.88rem] text-text-dim">
          The last 50 inbound webhook deliveries (Fathom, and Calendly once it&rsquo;s connected) with their
          outcome — nothing is silently dropped, even a call that matched no lead.
        </p>
        <Link href="/sales/crm" className="mt-2 inline-block text-[0.78rem] font-semibold text-accent-strong">
          ← Back to CRM
        </Link>
      </div>

      <Card className="mb-6 p-4">
        <h2 className="mb-1 text-[0.8rem] font-bold">Fire a test event</h2>
        <p className="mb-3 text-[0.76rem] text-text-dim">
          Sends a synthetic Fathom recording through the real signature-verification and matching code — no need to
          record a real call to check the integration works.
        </p>
        <FireTestEventPanel leads={leads} />
      </Card>

      <Card className="overflow-x-auto p-4">
        <h2 className="mb-3 text-[0.8rem] font-bold">
          Recent events <span className="font-mono text-[0.68rem] font-normal text-text-faint">{events.length}</span>
        </h2>
        {events.length === 0 ? (
          <p className="text-[0.8rem] text-text-faint">
            No webhook deliveries yet. Use &ldquo;Fire a test event&rdquo; above, or connect Fathom and record a call.
          </p>
        ) : (
          <table className="w-full text-[0.78rem]">
            <thead>
              <tr className="border-b border-border text-left text-text-faint">
                <th className="pb-1.5 font-medium">Time</th>
                <th className="pb-1.5 font-medium">Source</th>
                <th className="pb-1.5 font-medium">Status</th>
                <th className="pb-1.5 font-medium">Event</th>
                <th className="pb-1.5 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const style = STATUS_STYLE[e.status] ?? { wash: "var(--surface-2)", text: "var(--text-faint)", label: e.status };
                return (
                  <tr key={e.id} className="border-b border-border last:border-b-0">
                    <td className="py-1.5 pr-3 font-mono text-[0.7rem] text-text-faint">{formatCET(e.createdAt)}</td>
                    <td className="py-1.5 pr-3 font-semibold capitalize">
                      {e.source}
                      {e.isTest && (
                        <span className="ml-1.5 rounded-full bg-accent-wash px-1.5 py-0.5 text-[0.62rem] font-bold text-accent-strong">
                          TEST
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
                        style={{ backgroundColor: style.wash, color: style.text }}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="py-1.5 pr-3 font-mono text-[0.7rem] text-text-faint">{e.eventType ?? "—"}</td>
                    <td className="py-1.5 text-text-dim">{e.message}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
