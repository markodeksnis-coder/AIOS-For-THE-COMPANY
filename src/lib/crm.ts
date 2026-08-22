// Shared vocabulary and color helpers for the Inside Sales CRM — the CRM
// board, the lead detail page, and the dashboard all read from here so
// stage names/colors never drift apart.
//
// The 7-stage pipeline (new_lead -> booked_unconfirmed -> confirmed ->
// showed -> no_show | closed_won | closed_lost) is deliberately fixed —
// no more stages than this without a real reason, so the data stays
// disciplined enough to trust.

import { tagColor, parseTags } from "@/lib/project-style";

export { tagColor, parseTags };

export const LEAD_STAGES = [
  "new_lead",
  "booked_unconfirmed",
  "confirmed",
  "showed",
  "no_show",
  "closed_won",
  "closed_lost",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new_lead: "New Lead",
  booked_unconfirmed: "Booked (Unconfirmed)",
  confirmed: "Confirmed",
  showed: "Showed",
  no_show: "No-Show",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const LEAD_STAGE_STYLE: Record<LeadStage, { bar: string; wash: string; text: string }> = {
  new_lead: { bar: "#64748B", wash: "rgba(100,116,139,0.12)", text: "#94A3B8" },
  booked_unconfirmed: { bar: "#3B82F6", wash: "rgba(59,130,246,0.12)", text: "#60A5FA" },
  confirmed: { bar: "#14B8A6", wash: "rgba(20,184,166,0.12)", text: "#2DD4BF" },
  showed: { bar: "#8B5CF6", wash: "rgba(139,92,246,0.12)", text: "#A78BFA" },
  no_show: { bar: "#EF4444", wash: "rgba(239,68,68,0.12)", text: "#F87171" },
  closed_won: { bar: "#22C55E", wash: "rgba(34,197,94,0.12)", text: "#4ADE80" },
  closed_lost: { bar: "#F97316", wash: "rgba(249,115,22,0.12)", text: "#FB923C" },
};

// Call disposition — what actually happened on one logged call. Distinct
// from Lead.stage: logging a disposition is what *drives* the lead's stage
// forward (see OUTCOME_TO_STAGE below), it isn't the stage itself.
export const CALL_OUTCOMES = ["no_show", "booked_2nd_call", "pif", "plan", "no_money", "not_a_fit", "canceled"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_show: "No-Show",
  booked_2nd_call: "Booked 2nd Call",
  pif: "Paid In Full",
  plan: "Payment Plan",
  no_money: "No Money (Lost)",
  not_a_fit: "Not a Fit (Lost)",
  canceled: "Canceled",
};

/** Logging a disposition moves the lead's stage — `null` means don't touch the stage (a cancellation tells us nothing new). */
export const OUTCOME_TO_STAGE: Record<CallOutcome, LeadStage | null> = {
  no_show: "no_show",
  booked_2nd_call: "showed",
  pif: "closed_won",
  plan: "closed_won",
  no_money: "closed_lost",
  not_a_fit: "closed_lost",
  canceled: null,
};

/** Auto-derived loss reason when the rep didn't type one — editable, not enforced. */
export const OUTCOME_LOSS_REASON: Partial<Record<CallOutcome, string>> = {
  no_money: "Money",
  not_a_fit: "Not a fit",
};

/** Formats a Date in Central European Time, regardless of server or viewer
 *  timezone — every lead's next-call time reads the same way everywhere.
 *  Uses ICU's own abbreviation so it reads CEST in summer, CET in winter. */
export function formatCET(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export { initialsOf as leadInitials };
