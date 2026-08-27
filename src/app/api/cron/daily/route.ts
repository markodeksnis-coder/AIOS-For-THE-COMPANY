import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { buildAgentSystemPrompt, runAgentConversation } from "@/lib/agent-runtime";
import { runFollowUpSweep } from "@/lib/follow-up-sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHECK_IN_INSTRUCTION = [
  "This is your unprompted daily check-in — nobody is chatting with you right now, so don't wait to be asked.",
  "Use your tools to review your department's open issues, active projects, and scorecard status.",
  "If something is overdue or clearly needs attention, take one concrete action if it's genuinely warranted (e.g. bump a stalled issue's priority, or log a scorecard number that's due) — but don't invent numbers or force an action just to have done something.",
  "When you're done, write a short status note (2-5 sentences) as if leaving it for the founder to read later: what's overdue, what's on track, and what you did about it.",
].join(" ");

const WEEKLY_DEBRIEF_REVIEW_TITLE = "Weekly sales call debrief review";

/** Deterministic, not agent-judgment — every Monday this cron run creates
 *  the review issue exactly once, regardless of what any agent decides.
 *  Guards against the cron firing twice in a week (a redeploy, a manual
 *  trigger) by checking whether one was already created in the last 6
 *  days rather than trusting the day-of-week check alone. */
async function ensureWeeklyDebriefReviewIssue() {
  if (new Date().getUTCDay() !== 1) return; // Monday only

  const sixDaysAgo = new Date(Date.now() - 6 * 86_400_000);
  const existing = await db.issue.findFirst({
    where: { title: WEEKLY_DEBRIEF_REVIEW_TITLE, createdAt: { gte: sixDaysAgo } },
  });
  if (existing) return;

  await db.issue.create({
    data: {
      title: WEEKLY_DEBRIEF_REVIEW_TITLE,
      description:
        "30-45 minutes. Open /sales/crm/debriefs and:\n\n" +
        "1. Review this week's pattern panel — which CLOSER step keeps coming up weak, what the root-cause split looks like.\n" +
        "2. Pick ONE skill to drill next week based on that pattern.\n" +
        "3. Roleplay that exact moment 10-20 times until it's boring.\n" +
        "4. Save your best call as a \"greatest hit\" to rewatch during a slump.",
      status: "todo",
      priority: "high",
      department: "sales",
      assignee: "marko",
      dueDate: new Date().toISOString().slice(0, 10),
    },
  });
}

/** Every branch of GET() below calls this before returning — including the
 *  earliest auth-rejection branches — so a misconfigured cron leaves a
 *  trace even though nothing else in the route runs. Keyed by UTC date via
 *  upsert, so this can't be grown by a scheduler retry or a stray
 *  unauthenticated hit. Never throws — a logging failure must not turn a
 *  real cron failure into an unhandled exception. */
async function recordCronRun(ok: boolean, reason: string) {
  const date = new Date().toISOString().slice(0, 10);
  try {
    await db.cronRun.upsert({
      where: { date },
      create: { date, ok, reason },
      update: { ok, reason, lastAt: new Date() },
    });
  } catch (err) {
    console.error("Failed to record cron run:", err);
  }
}

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
    await recordCronRun(false, "missing_cron_secret_env");
    return NextResponse.json(
      { error: "CRON_SECRET isn't configured on the server yet — add it in Vercel's env vars." },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    await recordCronRun(false, "unauthorized");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await ensureWeeklyDebriefReviewIssue();

  if (!process.env.ANTHROPIC_API_KEY) {
    await recordCronRun(false, "missing_anthropic_api_key");
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

  // Same sweep the manual "Run AI follow-up sweep" button triggers — folded
  // into this existing cron instead of its own Vercel cron entry, so a lead
  // that goes cold gets a drafted follow-up even if nobody opens the CRM.
  let followUpSweep: unknown;
  try {
    followUpSweep = await runFollowUpSweep();
  } catch (err) {
    followUpSweep = { ran: false, reason: err instanceof Error ? err.message : "Unknown error" };
  }

  await recordCronRun(true, "success");

  return NextResponse.json({ ranAt: new Date().toISOString(), results, followUpSweep });
}
