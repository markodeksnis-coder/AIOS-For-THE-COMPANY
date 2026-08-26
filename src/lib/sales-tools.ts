// Inside Sales CRM tools — only ever attached to the Sales department's
// agents (Head of Sales, Sales Coach). Leads have no `department` column
// since this whole model group only exists for Sales, so no department
// re-check is needed here the way agent-tools.ts re-checks Issues/Projects.

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  LEAD_STAGES,
  CALL_STATUSES,
  CALL_RESULTS,
  CALL_STATUS_TO_STAGE,
  CALL_RESULT_TO_STAGE,
  RESULT_LOSS_REASON,
  STAGE_DEFAULT_PROBABILITY,
  CLOSER_STEPS,
  ROOT_CAUSES,
  OBJECTION_TYPES,
  type LeadStage,
  type CallStatus,
  type CallResult,
} from "@/lib/crm";
import { FOLLOW_UP_SEQUENCES, getFollowUpSequence } from "@/lib/follow-up-sequences";

export const SALES_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_leads",
    description:
      "List CRM leads, optionally filtered by stage and/or a name search. Use this to find a lead's id — e.g. search: \"Josh\" to find a lead named Josh.",
    input_schema: {
      type: "object",
      properties: {
        stage: { type: "string", enum: [...LEAD_STAGES], description: "Optional stage filter." },
        search: { type: "string", description: "Optional case-insensitive substring match against the lead's name." },
      },
    },
  },
  {
    name: "get_lead",
    description:
      "Get full detail on one lead: contact info, deal value, tags, notes, and its full call history — each call includes its callStatus and result, notes, recording link, exact start time, transcript (when Fathom captured one), and its post-call debrief (if one was filled in). Use this to ground a follow-up or Loom script in what actually happened on a specific call.",
    input_schema: {
      type: "object",
      properties: { leadId: { type: "string" } },
      required: ["leadId"],
    },
  },
  {
    name: "log_sales_call",
    description:
      "Log a call — two separate things: callStatus (did they show up: booked/showed/no_show/cancelled/rescheduled) and, once callStatus is 'showed', an optional result (closed_won/closed_lost/follow_up/not_qualified). This moves the lead's stage automatically — result wins when set, otherwise callStatus does (showed -> 'showed', no_show -> 'no_show', booked/rescheduled -> 'booked').",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        scheduledAt: { type: "string", description: "ISO datetime, e.g. 2026-08-24T15:00. Defaults to now if omitted." },
        callStatus: { type: "string", enum: [...CALL_STATUSES] },
        result: { type: "string", enum: [...CALL_RESULTS], description: "Only meaningful once callStatus is 'showed'." },
        rep: { type: "string" },
        recordingLink: { type: "string" },
        planLength: { type: "string", description: "Only meaningful when result is 'closed_won' and it was a payment plan, e.g. '6 months'." },
        cashCollected: { type: "number", description: "Optional amount collected on this call." },
        lossReason: { type: "string", description: "Only meaningful when result is closed_lost/not_qualified." },
        notes: { type: "string" },
      },
      required: ["leadId", "callStatus"],
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
    name: "get_follow_up_sequence",
    description:
      "Get the full message copy for one named follow-up SOP sequence (see the sequence index in your instructions) — every message it contains, with day, channel, and the real (placeholder-filled) body text to personalize from. Call this before drafting a closed-lost or on-demand follow-up whenever a matching sequence exists, so the draft is grounded in the company's actual written playbook instead of invented from scratch.",
    input_schema: {
      type: "object",
      properties: {
        sequenceId: { type: "string", enum: FOLLOW_UP_SEQUENCES.map((s) => s.id) },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "save_lead_draft",
    description:
      "Save a personalized outreach draft for a lead — the founder reviews and sends it themselves, this never sends anything. For a no-show lead, write an email AND a text (2 calls) — there's no written SOP sequence for no-shows yet, so draft these from the call/lead specifics. For a closed-lost lead, first classify the lead's temperature (hot/warm/general/disqualified) from get_lead's debrief data (loss reason, root cause, objection type), call get_follow_up_sequence for the matching sequence, and write a Loom video script AND a text (2 calls) grounded in that sequence's real copy — fill in its placeholders (NAME, OBJECTION, etc.) from the actual call. Use kind \"on_demand_followup\" for anything asked for directly (e.g. \"write a Loom script for Josh's call yesterday\", \"draft the day 5 warm-list follow-up for Sarah\") — pull the matching sequence the same way when one applies. Every call MUST include leadId, kind, channel, and content — sequenceId/sequenceDay are optional but should be set whenever the draft came from a sequence, so it's tracked back to its source.",
    input_schema: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        kind: { type: "string", enum: ["no_show_followup", "closed_lost_followup", "on_demand_followup"] },
        channel: { type: "string", enum: ["email", "sms", "loom_script"] },
        content: { type: "string", description: "The actual drafted copy, ready to send/read." },
        sequenceId: {
          type: "string",
          enum: FOLLOW_UP_SEQUENCES.map((s) => s.id),
          description: "The SOP sequence this draft was pulled from, if any.",
        },
        sequenceDay: { type: "string", description: "The sequence's own day value for this message, e.g. \"0\" or \"17-21\", if any." },
      },
      required: ["leadId", "kind", "channel", "content"],
    },
  },
  {
    name: "get_call_debriefs",
    description:
      "Get post-call debriefs for pattern analysis — use this for a weekly review request like \"what do I need to work on this week\" or \"what patterns should I focus on.\" Defaults to the last 7 days. Returns each debrief in full (weakest CLOSER step, root cause, objection type, the exact objection/doubt-moment/replay-moment/prospect's-blocker in the rep's own words) plus simple counts by weakest step, root cause, and objection type. The counts point at the pattern; the raw debrief text is what makes the coaching concrete — read both before answering.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "How many days back to look. Defaults to 7." },
      },
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
        const search = str(input, "search");
        const where: { stage?: string; name?: { contains: string } } = {};
        if (stage) where.stage = stage;
        if (search) where.name = { contains: search };
        const leads = await db.lead.findMany({
          where: Object.keys(where).length ? where : undefined,
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
          include: { calls: { orderBy: { scheduledAt: "desc" }, include: { debrief: true } } },
        });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };
        return { output: lead, summary: null, isError: false };
      }
      case "log_sales_call": {
        const leadId = str(input, "leadId");
        const callStatus = str(input, "callStatus");
        if (!leadId || !callStatus || !(CALL_STATUSES as readonly string[]).includes(callStatus)) {
          return {
            output: { error: "leadId and a valid callStatus are required" },
            summary: null,
            isError: true,
          };
        }
        const lead = await db.lead.findUnique({ where: { id: leadId } });
        if (!lead) return { output: { error: "lead not found" }, summary: null, isError: true };

        const scheduledAtRaw = str(input, "scheduledAt");
        const occurredAt = scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();
        if (Number.isNaN(occurredAt.getTime())) {
          return { output: { error: "scheduledAt is not a valid date/time" }, summary: null, isError: true };
        }
        const scheduledAt = occurredAt.toISOString().slice(0, 10);

        const resultRaw = str(input, "result");
        const result = resultRaw && (CALL_RESULTS as readonly string[]).includes(resultRaw) ? resultRaw : null;

        const rawCash = input.cashCollected;
        const cashCollected = typeof rawCash === "number" ? rawCash : null;
        const lossReason = str(input, "lossReason") ?? (result ? RESULT_LOSS_REASON[result as CallResult] : null) ?? null;
        const recordingLink = str(input, "recordingLink");
        const notes = str(input, "notes");

        await db.$transaction(async (tx) => {
          // A Fathom recording may have already created a "showed, pending
          // result" row, or a Calendly booking a "booked" row, for this
          // lead's most recent call — finish that row instead of logging a
          // second one for the same call (mirrors logSalesCall in
          // lib/actions/leads.ts).
          const pending =
            callStatus === "showed" || callStatus === "no_show"
              ? await tx.salesCall.findFirst({
                  where: { leadId, callStatus: { in: ["showed", "booked"] }, result: null },
                  orderBy: { createdAt: "desc" },
                })
              : null;

          if (pending) {
            await tx.salesCall.update({
              where: { id: pending.id },
              data: {
                scheduledAt,
                startedAt: occurredAt,
                callStatus,
                result,
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
                startedAt: occurredAt,
                callStatus,
                result,
                rep: str(input, "rep"),
                recordingLink,
                planLength: str(input, "planLength"),
                lossReason,
                cashCollected,
                notes,
              },
            });
          }
          const stage = result
            ? CALL_RESULT_TO_STAGE[result as CallResult]
            : CALL_STATUS_TO_STAGE[callStatus as CallStatus];
          const data: {
            stage?: string;
            stageProbability?: number;
            stageChangedAt?: Date;
            lossReason?: string | null;
            cashCollected?: { increment: number };
            nextCallAt: Date | null;
          } = {
            nextCallAt: callStatus === "booked" || callStatus === "rescheduled" ? occurredAt : null,
          };
          if (stage) {
            data.stage = stage;
            data.stageProbability = STAGE_DEFAULT_PROBABILITY[stage as LeadStage];
            if (lead.stage !== stage) data.stageChangedAt = new Date();
          }
          if (stage === "closed_lost") data.lossReason = lossReason;
          if (cashCollected) data.cashCollected = { increment: cashCollected };
          await tx.lead.update({ where: { id: leadId }, data });
        });

        safeRevalidate("/sales/crm", `/sales/crm/${leadId}`, "/sales/crm/calls");
        return {
          output: { leadId, callStatus, result },
          summary: `Logged a ${callStatus}${result ? ` (${result})` : ""} call for "${lead.name}"`,
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
        await db.lead.update({
          where: { id: leadId },
          data: {
            stage,
            stageProbability: STAGE_DEFAULT_PROBABILITY[stage as LeadStage],
            ...(lead.stage !== stage ? { stageChangedAt: new Date() } : {}),
          },
        });
        safeRevalidate("/sales/crm", `/sales/crm/${leadId}`);
        return { output: { leadId, stage }, summary: `Moved "${lead.name}" to ${stage}`, isError: false };
      }
      case "get_follow_up_sequence": {
        const sequenceId = str(input, "sequenceId");
        if (!sequenceId) return { output: { error: "sequenceId is required" }, summary: null, isError: true };
        const sequence = getFollowUpSequence(sequenceId);
        if (!sequence) return { output: { error: `no sequence with id "${sequenceId}"` }, summary: null, isError: true };
        return { output: sequence, summary: null, isError: false };
      }
      case "save_lead_draft": {
        const leadId = str(input, "leadId");
        const kind = str(input, "kind");
        const channel = str(input, "channel");
        const content = str(input, "content");
        const sequenceId = str(input, "sequenceId");
        const sequenceDay = str(input, "sequenceDay");
        const validKinds = ["no_show_followup", "closed_lost_followup", "on_demand_followup"];
        if (
          !leadId ||
          !content ||
          !kind ||
          !validKinds.includes(kind) ||
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

        const kindLabel =
          kind === "no_show_followup"
            ? "No-show follow-up"
            : kind === "closed_lost_followup"
              ? "Closed-lost follow-up"
              : "On-demand follow-up";
        const sequence = sequenceId ? getFollowUpSequence(sequenceId) : undefined;
        const templateName = sequence ? `${kindLabel} — ${sequence.name}` : kindLabel;

        // One touch centralizes every draft written for the same trigger —
        // reuse the still-open (not yet sent) touch for this lead+template
        // combo instead of spawning a duplicate queue entry every time the
        // agent is asked to draft the email, then the text, for one event.
        let touch = await db.followUpTouch.findFirst({
          where: { leadId, templateName, sentAt: null },
          orderBy: { createdAt: "desc" },
        });
        if (!touch) {
          touch = await db.followUpTouch.create({
            data: { leadId, templateName, dueAt: new Date() },
          });
        }

        await db.leadDraft.create({
          data: { leadId, kind, channel, content, sequenceId, sequenceDay, followUpTouchId: touch.id },
        });
        safeRevalidate(`/sales/crm/${leadId}`, "/sales/crm/follow-ups");
        return {
          output: { leadId, kind, channel, followUpTouchId: touch.id },
          summary: `Drafted a ${channel} ${kindLabel.toLowerCase()} for "${lead.name}" — queued in Follow-ups`,
          isError: false,
        };
      }
      case "get_call_debriefs": {
        const rawDays = input.days;
        const days = typeof rawDays === "number" && rawDays > 0 ? rawDays : 7;
        const since = new Date(Date.now() - days * 86_400_000);
        const debriefs = await db.callDebrief.findMany({
          where: { createdAt: { gte: since } },
          include: { salesCall: { include: { lead: { select: { name: true } } } } },
          orderBy: { createdAt: "desc" },
        });

        const countBy = <T extends string>(values: readonly T[], get: (d: (typeof debriefs)[number]) => string | null) =>
          values
            .map((v) => ({ value: v, count: debriefs.filter((d) => get(d) === v).length }))
            .filter((r) => r.count > 0)
            .sort((a, b) => b.count - a.count);

        const scores = (get: (d: (typeof debriefs)[number]) => number | null) =>
          debriefs.map(get).filter((n): n is number => n !== null);
        const avg = (nums: number[]) => (nums.length ? Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10 : null);

        return {
          output: {
            periodDays: days,
            totalDebriefs: debriefs.length,
            avgScriptAdherence: avg(scores((d) => d.scriptAdherence)),
            avgCommitmentScore: avg(scores((d) => d.commitmentScore)),
            weakestStepCounts: countBy(CLOSER_STEPS, (d) => d.weakestStep),
            rootCauseCounts: countBy(ROOT_CAUSES, (d) => d.rootCause),
            objectionTypeCounts: countBy(OBJECTION_TYPES, (d) => d.objectionType),
            debriefs: debriefs.map((d) => ({
              leadName: d.salesCall.lead.name,
              callDate: d.salesCall.scheduledAt,
              callStatus: d.salesCall.callStatus,
              result: d.salesCall.result,
              weakestStep: d.weakestStep,
              rootCause: d.rootCause,
              objectionType: d.objectionType,
              objectionOther: d.objectionOther,
              finalObjection: d.finalObjection,
              doubtMoment: d.doubtMoment,
              replayMoment: d.replayMoment,
              prospectDream: d.prospectDream,
              prospectBlocker: d.prospectBlocker,
              notEstablished: d.notEstablished,
              endReason: d.endReason,
              scriptAdherence: d.scriptAdherence,
              commitmentScore: d.commitmentScore,
            })),
          },
          summary: null,
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
