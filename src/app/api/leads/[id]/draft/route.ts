import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildAgentSystemPrompt, runAgentConversation } from "@/lib/agent-runtime";
import { SALES_AGENT_SLUG, DRAFT_INSTRUCTIONS, type FollowUpDraftKind } from "@/lib/sales-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: leadId } = await params;

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

  const lead = await db.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
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
      { role: "user", content: `Lead id: ${leadId}. ${DRAFT_INSTRUCTIONS[kind as FollowUpDraftKind]}` },
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
