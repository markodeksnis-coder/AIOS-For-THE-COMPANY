import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, DollarSign, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { LeadStageSelect } from "@/components/crm/lead-stage-select";
import { LeadEditForm } from "@/components/crm/lead-edit-form";
import { LogCallForm } from "@/components/crm/log-call-form";
import { LeadDraftsPanel } from "@/components/crm/lead-drafts-panel";
import { ConfirmCallButton } from "@/components/crm/confirm-call-button";
import { parseTags, tagColor, CALL_OUTCOME_LABELS, OUTCOME_TO_STAGE, LEAD_STAGE_STYLE } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      calls: { orderBy: { scheduledAt: "desc" } },
      drafts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();

  const tags = parseTags(lead.tags);
  const noShowCount = lead.calls.filter((c) => c.outcome === "no_show").length;
  const ev = lead.dealValue && lead.stageProbability ? Math.round(lead.dealValue * (lead.stageProbability / 100)) : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/sales/crm" className="mb-4 inline-block text-[0.8rem] text-text-dim hover:text-accent">
        ← CRM
      </Link>

      <Card className="mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{lead.name}</h1>
              <LeadStageSelect id={lead.id} stage={lead.stage} />
              {lead.stage === "booked_unconfirmed" && <ConfirmCallButton id={lead.id} />}
              {noShowCount > 0 && (
                <span className="rounded-full border border-critical/40 px-2.5 py-0.5 text-[0.68rem] font-bold text-critical">
                  no-show ×{noShowCount}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.8rem] text-text-dim">
              {lead.email && (
                <span className="flex items-center gap-1.5">
                  <Mail size={13} /> {lead.email}
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone size={13} /> {lead.phone}
                </span>
              )}
              {lead.timezone && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} /> {lead.timezone}
                </span>
              )}
              {lead.cashCollected > 0 && (
                <span className="flex items-center gap-1.5 font-bold text-good">
                  <DollarSign size={13} /> {lead.cashCollected.toLocaleString()} collected
                </span>
              )}
              {ev !== null && (
                <span className="font-mono text-[0.75rem] font-bold text-accent-strong">EV ${ev.toLocaleString()}</span>
              )}
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
                    style={{ backgroundColor: `${tagColor(t)}22`, color: tagColor(t) }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.7rem] text-text-faint">
              {lead.source && <span>source: {lead.source}</span>}
              {lead.funnel && <span>funnel: {lead.funnel}</span>}
              {lead.repName && <span>rep: {lead.repName}</span>}
              {lead.productInterest && <span>interest: {lead.productInterest}</span>}
              {lead.targetPrice && <span>target: ${lead.targetPrice.toLocaleString()}</span>}
            </p>
            {lead.stage === "closed_lost" && lead.lossReason && (
              <p className="mt-2 text-[0.8rem] font-semibold text-warn">Loss reason: {lead.lossReason}</p>
            )}
          </div>
        </div>
        {lead.notes && <p className="mt-4 max-w-[70ch] text-[0.85rem] text-text-dim">{lead.notes}</p>}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <LeadDraftsPanel
            leadId={lead.id}
            stage={lead.stage}
            initialDrafts={lead.drafts.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() }))}
          />

          <Card className="p-4">
            <h2 className="mb-3 text-[0.8rem] font-bold">Call history</h2>
            {lead.calls.length === 0 ? (
              <p className="text-[0.8rem] text-text-faint">No calls logged yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lead.calls.map((c) => {
                  const stage = OUTCOME_TO_STAGE[c.outcome as keyof typeof OUTCOME_TO_STAGE];
                  const style = stage ? LEAD_STAGE_STYLE[stage] : undefined;
                  return (
                    <div key={c.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-border p-2.5">
                      <span className="mt-0.5 font-mono text-[0.72rem] text-text-faint">{c.scheduledAt}</span>
                      <div className="min-w-0 flex-1">
                        {c.notes && <p className="text-[0.8rem] text-text-dim">{c.notes}</p>}
                        {c.recordingLink && (
                          <a
                            href={c.recordingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[0.74rem] text-accent-strong hover:underline"
                          >
                            recording ↗
                          </a>
                        )}
                      </div>
                      {c.rep && <span className="shrink-0 font-mono text-[0.7rem] text-text-faint">{c.rep}</span>}
                      {c.cashCollected ? (
                        <span className="shrink-0 font-mono text-[0.72rem] font-bold text-good">
                          ${c.cashCollected.toLocaleString()}
                        </span>
                      ) : null}
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
                        style={{
                          backgroundColor: style?.wash ?? "var(--surface-2)",
                          color: style?.text ?? "var(--text-faint)",
                        }}
                      >
                        {CALL_OUTCOME_LABELS[c.outcome as keyof typeof CALL_OUTCOME_LABELS] ?? c.outcome}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <LogCallForm leadId={lead.id} />
        </div>

        <div>
          <LeadEditForm
            lead={{
              id: lead.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              timezone: lead.timezone,
              source: lead.source,
              funnel: lead.funnel,
              productInterest: lead.productInterest,
              targetPrice: lead.targetPrice,
              repName: lead.repName,
              tags: lead.tags,
              notes: lead.notes,
              dealValue: lead.dealValue,
              stageProbability: lead.stageProbability,
            }}
          />
        </div>
      </div>
    </div>
  );
}
