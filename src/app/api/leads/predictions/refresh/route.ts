import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildAgentSystemPrompt, runAgentConversation } from "@/lib/agent-runtime";
import { PREDICTION_TOOLS, executeSalesTool } from "@/lib/sales-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SALES_AGENT_SLUG = "head-of-sales";

const INSTRUCTION = [
  "Use list_open_leads to see every lead currently booked or no-close (the open pipeline).",
  "Rank the top 5 most likely to close, using call notes, tags, and cash size as signals — if there are fewer than 5 open leads, rank all of them.",
  "Call save_hot_lead_prediction once per pick, in order from rank 1 (hottest) to 5, with one or two sentences of concrete reasoning each — not a generic 'seems promising.'",
].join(" ");

export async function POST() {
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
    // Clear the previous batch first so a partial/failed run can't leave a
    // mix of old and new ranks on the board.
    await db.hotLeadPrediction.deleteMany({});

    const systemPrompt = await buildAgentSystemPrompt(agent);
    const conversation: Anthropic.MessageParam[] = [{ role: "user", content: INSTRUCTION }];
    const { actions } = await runAgentConversation(agent, systemPrompt, conversation, {
      tools: PREDICTION_TOOLS,
      execute: (name, input) => executeSalesTool(name, input),
    });

    const predictions = await db.hotLeadPrediction.findMany({
      orderBy: { rank: "asc" },
      include: { lead: { select: { id: true, name: true, stage: true, cashCollected: true } } },
    });

    return NextResponse.json({ actions, predictions });
  } catch (err) {
    console.error("Prediction refresh error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 502 });
  }
}
