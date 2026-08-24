import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, DollarSign, Clock, MapPin, AtSign, CalendarClock, Building2 } from "lucide-react";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { LeadStageSelect } from "@/components/crm/lead-stage-select";
import { LeadEditForm } from "@/components/crm/lead-edit-form";
import { LogCallForm } from "@/components/crm/log-call-form";
import { LeadDraftsPanel } from "@/components/crm/lead-drafts-panel";
import { ConfirmCallButton } from "@/components/crm/confirm-call-button";
import {
  parseTags,
  tagColor,
  formatCET,
  toBerlinDatetimeLocal,
  callOutcomeLabel,
  CALL_STATUS_TO_STAGE,
  CALL_RESULT_TO_STAGE,
  LEAD_STAGE_STYLE,
  DEBRIEFABLE_CALL_STATUSES,
  type CallStatus,
  type CallResult,
} from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      calls: { orderBy: { scheduledAt: "desc" }, include: { debrief: { select: { id: true } } } },
      drafts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lead) notFound();

  const tags = parseTags(lead.tags);
  const noShowCount = lead.calls.filter((c) => c.callStatus === "no_show").length;
  const pendingCall = lead.calls.find((c) => c.callStatus === "showed" && c.result === null) ?? null;
  const ev = lead.dealValue && lead.stageProbability ? Math.round(lead.dealValue * (lead.stageProbability / 100)) : null;

  const qualificationFields = [
    { label: "Location", value: lead.location, icon: MapPin },
    { label: "Instagram / LinkedIn", value: lead.instagramOrLinkedin, icon: AtSign },
    { label: "Years running agency", value: lead.yearsRunningAgency != null ? String(lead.yearsRunningAgency) : null },
    { label: "Monthly revenue", value: lead.monthlyRevenue != null ? `$${lead.monthlyRevenue.toLocaleString()}` : null },
    { label: "Sells / runs paid ads?", value: lead.sellsService },
  ].filter((f) => f.value);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/sales/crm" className="mb-4 inline-block text-[0.8rem] text-text-dim hover:text-accent">
        ← CRM
      </Link>

      {/* One-glance qualification card */}
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

            {lead.nextCallAt && (
              <div className="mt-2 flex items-center gap-1.5 text-[0.83rem] font-bold text-accent-strong">
                <CalendarClock size={14} />
                Next call: {formatCET(lead.nextCallAt)}
              </div>
            )}

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
              {lead.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 size={13} /> {lead.company}
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

        {qualificationFields.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3 lg:grid-cols-5">
            {qualificationFields.map((f) => (
              <div key={f.label}>
                <div className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest text-text-faint">
                  {f.icon && <f.icon size={11} />}
                  {f.label}
                </div>
                <div className="mt-0.5 text-[0.85rem] font-semibold">{f.value}</div>
              </div>
            ))}
          </div>
        )}

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
                  const stage = c.result
                    ? CALL_RESULT_TO_STAGE[c.result as CallResult]
                    : CALL_STATUS_TO_STAGE[c.callStatus as CallStatus];
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
                        {callOutcomeLabel(c.callStatus, c.result)}
                      </span>
                      {DEBRIEFABLE_CALL_STATUSES.includes(c.callStatus as never) && (
                        <Link
                          href={`/sales/crm/debriefs/${c.id}`}
                          className="shrink-0 text-[0.72rem] font-semibold text-accent-strong hover:underline"
                        >
                          {c.debrief ? "Edit debrief" : "Debrief →"}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <LogCallForm
            leadId={lead.id}
            pendingCall={
              pendingCall
                ? {
                    scheduledAt: toBerlinDatetimeLocal(pendingCall.startedAt ?? new Date(pendingCall.scheduledAt)),
                    recordingLink: pendingCall.recordingLink,
                    notes: pendingCall.notes,
                  }
                : null
            }
          />
        </div>

        <div>
          <LeadEditForm
            lead={{
              id: lead.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              company: lead.company,
              timezone: lead.timezone,
              source: lead.source,
              funnel: lead.funnel,
              notes: lead.notes,
              dealValue: lead.dealValue,
              location: lead.location,
              instagramOrLinkedin: lead.instagramOrLinkedin,
              yearsRunningAgency: lead.yearsRunningAgency,
              monthlyRevenue: lead.monthlyRevenue,
              nextCallAt: lead.nextCallAt ? lead.nextCallAt.toISOString().slice(0, 16) : null,
            }}
          />
        </div>
      </div>
    </div>
  );
}
