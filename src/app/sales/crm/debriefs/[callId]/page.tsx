import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { DebriefForm } from "@/components/crm/debrief-form";
import { callOutcomeLabel } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function DebriefPage({ params }: { params: Promise<{ callId: string }> }) {
  const { callId } = await params;

  const call = await db.salesCall.findUnique({
    where: { id: callId },
    include: { lead: { select: { id: true, name: true } }, debrief: true },
  });
  if (!call) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/sales/crm/${call.lead.id}`}
        className="mb-4 inline-block text-[0.8rem] text-text-dim hover:text-accent"
      >
        ← {call.lead.name}
      </Link>

      <Card className="mb-6 p-4">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Sales · Call debrief
        </div>
        <h1 className="mt-1 text-xl font-extrabold tracking-tight">{call.lead.name}</h1>
        <p className="mt-1 text-[0.8rem] text-text-dim">
          {call.scheduledAt} · {callOutcomeLabel(call.callStatus, call.result)}
        </p>
      </Card>

      <DebriefForm
        callId={call.id}
        leadId={call.lead.id}
        initial={{
          endReason: call.debrief?.endReason ?? null,
          notEstablished: call.debrief?.notEstablished ?? null,
          scriptAdherence: call.debrief?.scriptAdherence ?? null,
          weakestStep: call.debrief?.weakestStep ?? null,
          prospectDream: call.debrief?.prospectDream ?? null,
          prospectBlocker: call.debrief?.prospectBlocker ?? null,
          commitmentScore: call.debrief?.commitmentScore ?? null,
          finalObjection: call.debrief?.finalObjection ?? null,
          objectionType: call.debrief?.objectionType ?? null,
          objectionOther: call.debrief?.objectionOther ?? null,
          doubtMoment: call.debrief?.doubtMoment ?? null,
          replayMoment: call.debrief?.replayMoment ?? null,
          rootCause: call.debrief?.rootCause ?? null,
        }}
      />
    </div>
  );
}
