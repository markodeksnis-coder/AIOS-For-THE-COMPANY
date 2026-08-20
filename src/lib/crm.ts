// Shared vocabulary and color helpers for the Inside Sales CRM — the CRM
// board, the lead detail page, and the dashboard all read from here so
// stage names/colors never drift apart.

import { tagColor, parseTags } from "@/lib/project-style";

export { tagColor, parseTags };

export const LEAD_STAGES = ["booked", "no_show", "no_close", "closed"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  booked: "Booked",
  no_show: "No-Show",
  no_close: "No-Close",
  closed: "Closed",
};

export const LEAD_STAGE_STYLE: Record<LeadStage, { bar: string; wash: string; text: string }> = {
  booked: { bar: "#3B82F6", wash: "rgba(59,130,246,0.12)", text: "#60A5FA" },
  no_show: { bar: "#EF4444", wash: "rgba(239,68,68,0.12)", text: "#F87171" },
  no_close: { bar: "#EAB308", wash: "rgba(234,179,8,0.12)", text: "#FACC15" },
  closed: { bar: "#22C55E", wash: "rgba(34,197,94,0.12)", text: "#4ADE80" },
};

export const CALL_OUTCOMES = ["booked", "no_show", "no_close", "closed", "canceled"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  booked: "Booked",
  no_show: "No-Show",
  no_close: "No-Close (didn't buy)",
  closed: "Closed (bought)",
  canceled: "Canceled",
};

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export { initialsOf as leadInitials };
