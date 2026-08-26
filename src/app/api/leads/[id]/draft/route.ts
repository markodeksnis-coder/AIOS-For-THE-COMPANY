import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildAgentSystemPrompt, runAgentConversation } from "@/lib/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The Inside Sales CRM only has one agent working it today — if more sales
// agents show up later this could become a lookup, but for now there's
// nothing to disambiguate.
const SALES_AGENT_SLUG = "head-of-sales";

const INSTRUCTIONS: Record<string, string> = {
  no_show_followup:
    "This lead didn't show for their booked call. Use get_lead to pull their full detail and call history, then write a personalized email AND a personalized text message to get them to reschedule and show up — reference specifics about them, don't write generic copy. Save each with save_lead_draft (kind: no_show_followup).",
  closed_lost_followup:
    "This lead showed up but didn't buy. Use get_lead to pull their full detail and call history (check the loss reason, root cause, and objection type from the debrief). Classify their lead temperature (hot/warm/general/disqualified — see the sequence index in your instructions), call get_follow_up_sequence for the matching sequence, then write a personalized Loom video script (what to say on camera) AND a personalized text message grounded in that sequence's real copy — fill in its placeholders from the actual call, don't paste it verbatim. Save each with save_lead_draft (kind: closed_lost_followup, sequenceId/sequenceDay set to what you used).",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind = (body as { kind?: unknown })?.kind;
  if (kind !== "no_show_followup" && kind !== "closed_lost_followup") {
    return NextResponse.json(
      { error: "Body must be { kind: 'no_show_followup' | 'closed_lost_followup' }." },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY isn't configured on the server yet — add it in Vercel's env vars." },
      { status: 503 }
    );
  }

  const agent = await db.brainFile.findFirst({
    where: { slug: SALES_AGENT_SLUG, type: "agent", status: "active" },
  });
  if (!agent) {
    return NextResponse.json({ error: "The sales agent isn't set up yet." }, { status: 503 });
  }

  try {
    const systemPrompt = await buildAgentSystemPrompt(agent);
    const conversation: Anthropic.MessageParam[] = [
      { role: "user", content: `Lead id: ${leadId}. ${INSTRUCTIONS[kind]}` },
    ];
    const { reply, actions } = await runAgentConversation(agent, systemPrompt, conversation);

    const drafts = await db.leadDraft.findMany({
      where: { leadId, kind },
      orderBy: { createdAt: "desc" },
      take: 2,
    });

    return NextResponse.json({ reply, actions, drafts });
  } catch (err) {
    console.error("Lead draft error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 502 });
  }
}
