// Inside Sales CRM tools — only ever attached to the Sales department's
// agents (Head of Sales, Sales Coach). Leads have no `department` column
// since this whole model group only exists for Sales, so no department
// re-check is needed here the way agent-tools.ts re-checks Issues/Projects.

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { LEAD_STAGES, CALL_OUTCOMES } from "@/lib/crm";

export const SALES_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_leads",
    description: "List CRM leads, optionally filtered by stage. Use this to find a lead's id.",
    input_schema: {
      type: "object",
      properties: {
        stage: { type: "string", enum: [...LEAD_STAGES], description: "Optional stage filter." },
      },
    },
  },
  {
    name: "get_lead",
    description: "Get full detail on one lead: contact info, tags, notes, and its call history.",
    input_schema: {
      type: "object",
      properties: { leadId: { type: "string" } },
      required: ["leadId"],
    },
  },
  {
    name: "log_sales_call",
    description:
      "Log a sales call for a lead and update the lead's stage to match the outcome. Use this when told about a call that happened.",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        scheduledAt: { type: "string", description: "ISO date, YYYY-MM-DD." },
        outcome: { type: "string", enum: [...CALL_OUTCOMES] },
        cashCollected: { type: "number", description: "Optional amount collected on this call." },
        notes: { type: "string" },
      },
      required: ["leadId", "scheduledAt", "outcome"],
    },
  },
  {
    name: "update_lead_stage",
    description: "Move a lead directly to a new CRM stage without logging a call.",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        stage: { type: "string", enum: [...LEAD_STAGES] },
      },
      required: ["leadId", "stage"],
    },
  },
  {
    name: "save_lead_draft",
    description:
      "Save a personalized outreach draft for a lead — the founder reviews and sends it themselves, this never sends anything. For a no-show lead, write an email AND a text (2 calls). For a no-close lead, write a Loom video script AND a text (2 calls).",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        kind: { type: "string", enum: ["no_show_followup", "no_close_followup"] },
        channel: { type: "string", enum: ["email", "sms", "loom_script"] },
        content: { type: "string", description: "The actual drafted copy, ready to send/read." },
      },
      required: ["leadId", "kind", "channel", "content"],
    },
  },
];

/** Only used by the dedicated hot-leads prediction run — kept separate from
 *  SALES_TOOLS so a normal chat can't be talked into re-ranking deals. */
export const PREDICTION_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_open_leads",
    description: "List every lead currently in 'booked' or 'no_close' stage — the open pipeline.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "save_hot_lead_prediction",
    description:
      "Save one ranked pick for the top-5 hottest open deals (most likely to close). Call this once per pick, ranks 1 (hottest) through 5.",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        rank: { type: "integer", minimum: 1, maximum: 5 },
        reasoning: { type: "string", description: "One or two sentences on why this lead is hot." },
      },
      required: ["leadId", "rank", "reasoning"],
    },
  },
];

type ToolOutcome = { output: unknown; summary: string | null; isError: boolean };

function str(input: Record<string, unknown>, key: string): string | null {
  const v = input[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function safeRevalidate(...paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // ignore — a mutation already succeeded; a revalidation failure must
      // never turn a successful write into a reported failure
    }
  }
}

export async function executeSalesTool(name: string, input: Record<string, unknown>): Promise<ToolOutcome> {
  try {
    switch (name) {
      case "list_leads": {
        const stage = str(input, "stage");
        const leads = await db.lead.findMany({
          where: stage ? { stage } : undefined,
          orderBy: { order: "asc" },
          take: 50,
          select: { id: true, name: true, stage: true, source: true, tags: true, cashCollected: true },
        });
        return { output: leads, summary: null, isError: false };
      }
      case "get_lead": {
        const leadId = str(input, "leadId");
        if (!leadId) return { output: { error: "leadId is required" }, summary: null, isError: true };
        const lead = await db.lead.findUnique({
          where: { id: leadId },
          include: { calls: { orderBy: { scheduledAt: "desc" } } },
        });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };
        return { output: lead, summary: null, isError: false };
      }
      case "log_sales_call": {
        const leadId = str(input, "leadId");
        const scheduledAt = str(input, "scheduledAt");
        const outcome = str(input, "outcome");
        if (!leadId || !scheduledAt || !outcome || !(CALL_OUTCOMES as readonly string[]).includes(outcome)) {
          return {
            output: { error: "leadId, scheduledAt, and a valid outcome are required" },
            summary: null,
            isError: true,
          };
        }
        const lead = await db.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };

        const rawCash = input.cashCollected;
        const cashCollected = typeof rawCash === "number" ? rawCash : null;

        await db.$transaction(async (tx) => {
          await tx.salesCall.create({
            data: { leadId, scheduledAt, outcome, cashCollected, notes: str(input, "notes") },
          });
          const data: { stage?: string; cashCollected?: { increment: number } } = {};
          if (outcome !== "canceled") data.stage = outcome;
          if (cashCollected) data.cashCollected = { increment: cashCollected };
          if (Object.keys(data).length) await tx.lead.update({ where: { id: leadId }, data });
        });

        safeRevalidate("/sales/crm", `/sales/crm/${leadId}`, "/sales/crm/calls");
        return {
          output: { leadId, outcome },
          summary: `Logged a ${outcome} call for "${lead.name}"`,
          isError: false,
        };
      }
      case "update_lead_stage": {
        const leadId = str(input, "leadId");
        const stage = str(input, "stage");
        if (!leadId || !stage || !(LEAD_STAGES as readonly string[]).includes(stage)) {
          return { output: { error: "leadId and a valid stage are required" }, summary: null, isError: true };
        }
        const lead = await db.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };
        await db.lead.update({ where: { id: leadId }, data: { stage } });
        safeRevalidate("/sales/crm", `/sales/crm/${leadId}`);
        return { output: { leadId, stage }, summary: `Moved "${lead.name}" to ${stage}`, isError: false };
      }
      case "save_lead_draft": {
        const leadId = str(input, "leadId");
        const kind = str(input, "kind");
        const channel = str(input, "channel");
        const content = str(input, "content");
        if (
          !leadId ||
          !content ||
          (kind !== "no_show_followup" && kind !== "no_close_followup") ||
          (channel !== "email" && channel !== "sms" && channel !== "loom_script")
        ) {
          return {
            output: { error: "leadId, a valid kind, a valid channel, and content are required" },
            summary: null,
            isError: true,
          };
        }
        const lead = await db.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };
        await db.leadDraft.create({ data: { leadId, kind, channel, content } });
        safeRevalidate(`/sales/crm/${leadId}`);
        return {
          output: { leadId, kind, channel },
          summary: `Drafted a ${channel} ${kind === "no_show_followup" ? "no-show" : "no-close"} follow-up for "${lead.name}"`,
          isError: false,
        };
      }
      case "list_open_leads": {
        const leads = await db.lead.findMany({
          where: { stage: { in: ["booked", "no_close"] } },
          orderBy: { order: "asc" },
          take: 50,
          include: { calls: { orderBy: { scheduledAt: "desc" }, take: 3 } },
        });
        return { output: leads, summary: null, isError: false };
      }
      case "save_hot_lead_prediction": {
        const leadId = str(input, "leadId");
        const reasoning = str(input, "reasoning");
        const rawRank = input.rank;
        const rank = typeof rawRank === "number" ? rawRank : Number(rawRank);
        if (!leadId || !reasoning || !Number.isInteger(rank) || rank < 1 || rank > 5) {
          return {
            output: { error: "leadId, an integer rank 1-5, and reasoning are required" },
            summary: null,
            isError: true,
          };
        }
        const lead = await db.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };
        await db.hotLeadPrediction.create({ data: { leadId, rank, reasoning } });
        safeRevalidate("/sales/crm");
        return { output: { leadId, rank }, summary: `Ranked "${lead.name}" #${rank}`, isError: false };
      }
      default:
        return { output: { error: `unknown tool: ${name}` }, summary: null, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { output: { error: message }, summary: null, isError: true };
  }
}
