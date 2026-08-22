// Inside Sales CRM tools — only ever attached to the Sales department's
// agents (Head of Sales, Sales Coach). Leads have no `department` column
// since this whole model group only exists for Sales, so no department
// re-check is needed here the way agent-tools.ts re-checks Issues/Projects.

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { LEAD_STAGES, LOGGABLE_CALL_OUTCOMES, OUTCOME_TO_STAGE, OUTCOME_LOSS_REASON } from "@/lib/crm";

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
    description: "Get full detail on one lead: contact info, deal value, tags, notes, and its call history.",
    input_schema: {
      type: "object",
      properties: { leadId: { type: "string" } },
      required: ["leadId"],
    },
  },
  {
    name: "log_sales_call",
    description:
      "Log what happened on a sales call. This moves the lead's stage automatically — no-show, booked_2nd_call moves it to 'showed', pif/plan close it won, no_money/not_a_fit close it lost.",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        scheduledAt: { type: "string", description: "ISO date, YYYY-MM-DD." },
        outcome: { type: "string", enum: [...LOGGABLE_CALL_OUTCOMES] },
        rep: { type: "string" },
        recordingLink: { type: "string" },
        planLength: { type: "string", description: "Only meaningful when outcome is 'plan', e.g. '6 months'." },
        cashCollected: { type: "number", description: "Optional amount collected on this call." },
        lossReason: { type: "string", description: "Only meaningful when outcome is no_money/not_a_fit." },
        notes: { type: "string" },
      },
      required: ["leadId", "scheduledAt", "outcome"],
    },
  },
  {
    name: "confirm_lead",
    description: "Mark a lead's booked call as confirmed (they replied yes / clicked confirm) — a state change, not a call outcome.",
    input_schema: {
      type: "object",
      properties: { leadId: { type: "string" } },
      required: ["leadId"],
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
      "Save a personalized outreach draft for a lead — the founder reviews and sends it themselves, this never sends anything. For a no-show lead, write an email AND a text (2 calls). For a closed-lost lead, write a Loom video script AND a text (2 calls).",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        kind: { type: "string", enum: ["no_show_followup", "closed_lost_followup"] },
        channel: { type: "string", enum: ["email", "sms", "loom_script"] },
        content: { type: "string", description: "The actual drafted copy, ready to send/read." },
      },
      required: ["leadId", "kind", "channel", "content"],
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
          select: {
            id: true,
            name: true,
            stage: true,
            source: true,
            tags: true,
            dealValue: true,
            stageProbability: true,
            cashCollected: true,
          },
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
        if (!leadId || !scheduledAt || !outcome || !(LOGGABLE_CALL_OUTCOMES as readonly string[]).includes(outcome)) {
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
        const lossReason = str(input, "lossReason") ?? OUTCOME_LOSS_REASON[outcome as never] ?? null;
        const recordingLink = str(input, "recordingLink");
        const notes = str(input, "notes");

        await db.$transaction(async (tx) => {
          // A Fathom recording may have already created a "completed,
          // pending disposition" row for this lead's most recent call —
          // finish that row instead of logging a second one for the same
          // call (mirrors logSalesCall in lib/actions/leads.ts).
          const pending = await tx.salesCall.findFirst({
            where: { leadId, outcome: "completed" },
            orderBy: { createdAt: "desc" },
          });

          if (pending) {
            await tx.salesCall.update({
              where: { id: pending.id },
              data: {
                scheduledAt,
                outcome,
                rep: str(input, "rep"),
                recordingLink: recordingLink ?? pending.recordingLink,
                planLength: str(input, "planLength"),
                lossReason,
                cashCollected,
                notes: notes ?? pending.notes,
              },
            });
          } else {
            await tx.salesCall.create({
              data: {
                leadId,
                scheduledAt,
                outcome,
                rep: str(input, "rep"),
                recordingLink,
                planLength: str(input, "planLength"),
                lossReason,
                cashCollected,
                notes,
              },
            });
          }
          const stage = OUTCOME_TO_STAGE[outcome as never];
          const data: { stage?: string; lossReason?: string | null; cashCollected?: { increment: number } } = {};
          if (stage) data.stage = stage;
          if (stage === "closed_lost") data.lossReason = lossReason;
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
      case "confirm_lead": {
        const leadId = str(input, "leadId");
        if (!leadId) return { output: { error: "leadId is required" }, summary: null, isError: true };
        const lead = await db.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };
        await db.lead.update({ where: { id: leadId }, data: { stage: "confirmed" } });
        safeRevalidate("/sales/crm", `/sales/crm/${leadId}`);
        return { output: { leadId, stage: "confirmed" }, summary: `Confirmed "${lead.name}"'s call`, isError: false };
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
          (kind !== "no_show_followup" && kind !== "closed_lost_followup") ||
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
          summary: `Drafted a ${channel} ${kind === "no_show_followup" ? "no-show" : "closed-lost"} follow-up for "${lead.name}"`,
          isError: false,
        };
      }
      default:
        return { output: { error: `unknown tool: ${name}` }, summary: null, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { output: { error: message }, summary: null, isError: true };
  }
}
