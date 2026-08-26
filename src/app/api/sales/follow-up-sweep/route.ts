import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { buildAgentSystemPrompt, runAgentConversation, type ActionTaken } from "@/lib/agent-runtime";
import { SALES_AGENT_SLUG, DRAFT_INSTRUCTIONS, type FollowUpDraftKind } from "@/lib/sales-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Keeps one sweep bounded — leads run in parallel (not summed), so this
// caps total concurrent Claude calls rather than total runtime per se.
const MAX_LEADS_PER_SWEEP = 5;

type GapLead = { id: string; name: string; kind: FollowUpDraftKind };

/** Every closed-lost or no-show lead that has never had a matching
 *  follow-up draft written for it — the actual gap the sweep exists to
 *  close. Most-recently-changed first, so a fresh sweep works the newest
 *  misses before working backward through older ones. */
async function findGapLeads(): Promise<GapLead[]> {
  const [closedLost, noShow] = await Promise.all([
    db.lead.findMany({
      where: { stage: "closed_lost", drafts: { none: { kind: "closed_lost_followup" } } },
      orderBy: { stageChangedAt: "desc" },
      take: MAX_LEADS_PER_SWEEP,
      select: { id: true, name: true },
    }),
    db.lead.findMany({
      where: { stage: "no_show", drafts: { none: { kind: "no_show_followup" } } },
      orderBy: { stageChangedAt: "desc" },
      take: MAX_LEADS_PER_SWEEP,
      select: { id: true, name: true },
    }),
  ]);

  return [
    ...closedLost.map((l) => ({ ...l, kind: "closed_lost_followup" as const })),
    ...noShow.map((l) => ({ ...l, kind: "no_show_followup" as const })),
  ]
    .sort(() => Math.random() - 0.5) // no inherent priority between the two kinds
    .slice(0, MAX_LEADS_PER_SWEEP);
}

type LeadOutcome =
  | { leadId: string; leadName: string; kind: FollowUpDraftKind; ok: true; draftsCreated: number; reply: string }
  | { leadId: string; leadName: string; kind: FollowUpDraftKind; ok: false; error: string };

async function draftForLead(
  agentFile: { id: string; slug: string; title: string; department: string | null },
  lead: GapLead,
  systemPrompt: string
): Promise<LeadOutcome> {
  try {
    const conversation: Anthropic.MessageParam[] = [
      { role: "user", content: `Lead id: ${lead.id}. ${DRAFT_INSTRUCTIONS[lead.kind]}` },
    ];
    const full = await db.brainFile.findUniqueOrThrow({ where: { id: agentFile.id } });
    const { reply, actions } = await runAgentConversation(full, systemPrompt, conversation);
    const draftsCreated = actions.filter((a: ActionTaken) => a.tool === "save_lead_draft").length;
    return { leadId: lead.id, leadName: lead.name, kind: lead.kind, ok: true, draftsCreated, reply };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { leadId: lead.id, leadName: lead.name, kind: lead.kind, ok: false, error: message };
  }
}

export async function POST() {
  // Check for work before requiring the Claude API key — "nothing to
  // sweep" shouldn't depend on server config that isn't needed to answer it.
  const gapLeads = await findGapLeads();
  if (gapLeads.length === 0) {
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      swept: 0,
      totalDraftsCreated: 0,
      results: [],
      message: "Nothing to sweep — every closed-lost and no-show lead already has a drafted follow-up.",
    });
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

  const systemPrompt = await buildAgentSystemPrompt(agent);
  const results = await Promise.all(gapLeads.map((lead) => draftForLead(agent, lead, systemPrompt)));

  const totalDraftsCreated = results.reduce((sum, r) => sum + (r.ok ? r.draftsCreated : 0), 0);
  const failures = results.filter((r) => !r.ok);

  const summaryLines = [
    `Swept ${results.length} lead(s) with no follow-up drafted yet, wrote ${totalDraftsCreated} draft(s).`,
    ...results.map((r) =>
      r.ok
        ? `- ${r.leadName} (${r.kind === "closed_lost_followup" ? "closed-lost" : "no-show"}): ${r.draftsCreated} draft(s)`
        : `- ${r.leadName}: failed — ${r.error}`
    ),
  ];

  await db.agentActivity.create({
    data: {
      agentSlug: agent.slug,
      agentTitle: agent.title,
      department: agent.department,
      kind: "follow_up_sweep",
      summary: summaryLines.join("\n"),
      actions: JSON.stringify(
        results.flatMap((r) => (r.ok ? [{ tool: "save_lead_draft", summary: `${r.leadName}: ${r.draftsCreated} draft(s)` }] : []))
      ),
    },
  });

  revalidatePath("/sales/crm/follow-ups");
  for (const r of results) revalidatePath(`/sales/crm/${r.leadId}`);

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    swept: results.length,
    totalDraftsCreated,
    failed: failures.length,
    results,
  });
}
