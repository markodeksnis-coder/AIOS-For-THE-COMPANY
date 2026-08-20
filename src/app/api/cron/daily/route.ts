import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildAgentSystemPrompt, runAgentConversation } from "@/lib/agent-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHECK_IN_INSTRUCTION = [
  "This is your unprompted daily check-in — nobody is chatting with you right now, so don't wait to be asked.",
  "Use your tools to review your department's open issues, active projects, and scorecard status.",
  "If something is overdue or clearly needs attention, take one concrete action if it's genuinely warranted (e.g. bump a stalled issue's priority, or log a scorecard number that's due) — but don't invent numbers or force an action just to have done something.",
  "When you're done, write a short status note (2-5 sentences) as if leaving it for the founder to read later: what's overdue, what's on track, and what you did about it.",
].join(" ");

type RunResult =
  | { slug: string; ok: true; summary: string; actionCount: number }
  | { slug: string; ok: false; error: string };

async function runOne(agent: { id: string; slug: string; title: string; department: string | null }): Promise<RunResult> {
  try {
    const full = await db.brainFile.findUniqueOrThrow({ where: { id: agent.id } });
    const systemPrompt = await buildAgentSystemPrompt(full);
    const conversation: Anthropic.MessageParam[] = [{ role: "user", content: CHECK_IN_INSTRUCTION }];
    const { reply, actions } = await runAgentConversation(full, systemPrompt, conversation);

    await db.agentActivity.create({
      data: {
        agentSlug: agent.slug,
        agentTitle: agent.title,
        department: agent.department,
        kind: "daily_digest",
        summary: reply,
        actions: JSON.stringify(actions),
      },
    });

    return { slug: agent.slug, ok: true, summary: reply, actionCount: actions.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Daily agent run failed for ${agent.slug}:`, err);
    return { slug: agent.slug, ok: false, error: message };
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET isn't configured on the server yet — add it in Vercel's env vars." },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY isn't configured on the server yet — add it in Vercel's env vars." },
      { status: 503 }
    );
  }

  const agents = await db.brainFile.findMany({
    where: { type: "agent", status: "active", department: { not: null } },
    select: { id: true, slug: true, title: true, department: true },
  });

  const results = await Promise.all(agents.map(runOne));
  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
