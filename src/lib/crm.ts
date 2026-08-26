// Shared vocabulary and color helpers for the Inside Sales CRM — the CRM
// board, the lead detail page, and the dashboard all read from here so
// stage names/colors never drift apart.
//
// The 5-stage pipeline (booked -> showed -> closed_won | closed_lost,
// with no_show as showed's sibling outcome) is deliberately fixed — no
// more stages than this without a real reason, so the data stays
// disciplined enough to trust. There is deliberately no separate "new
// lead" or "confirmed" stage — every lead starts at "Booked" (whether or
// not a call is actually on the calendar yet) and a booked call is either
// showed or no-show, and a showed call is either closed or not.

import { tagColor, parseTags } from "@/lib/project-style";

export { tagColor, parseTags };

export const LEAD_STAGES = ["booked", "showed", "no_show", "closed_won", "closed_lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  booked: "Booked",
  showed: "Showed",
  no_show: "No-Show",
  closed_won: "Close",
  closed_lost: "No Close",
};

// Default win-probability by stage — auto-applied whenever a lead's stage
// changes (booking, logging a call, dragging the board, a Calendly/Fathom
// webhook), so the Expected Value ranking on the dashboard works without
// ever asking a rep to type a probability by hand. Still a plain number
// on the lead, not a formula, so a specific deal can still be
// hand-adjusted later if it's genuinely more/less likely than the average.
export const STAGE_DEFAULT_PROBABILITY: Record<LeadStage, number> = {
  booked: 20,
  showed: 55,
  no_show: 15,
  closed_won: 100,
  closed_lost: 0,
};

/** Stages a lead can still be auto-advanced out of by a recording/booking
 *  landing — a recording is proof of attendance, but should never
 *  downgrade a lead a rep has already moved further (no-show, closed)
 *  than that. Shared by the Fathom webhook and the unmatched-call
 *  assignment action so both apply the same rule. */
export const OPEN_STAGES = new Set(["booked"]);

export const LEAD_STAGE_STYLE: Record<LeadStage, { bar: string; wash: string; text: string }> = {
  booked: { bar: "#3B82F6", wash: "rgba(59,130,246,0.12)", text: "#60A5FA" },
  showed: { bar: "#8B5CF6", wash: "rgba(139,92,246,0.12)", text: "#A78BFA" },
  no_show: { bar: "#EF4444", wash: "rgba(239,68,68,0.12)", text: "#F87171" },
  closed_won: { bar: "#22C55E", wash: "rgba(34,197,94,0.12)", text: "#4ADE80" },
  closed_lost: { bar: "#F97316", wash: "rgba(249,115,22,0.12)", text: "#FB923C" },
};

// Call outcome is two separate axes, not one combined field:
// - callStatus: what happened with the appointment itself (did they show up)
// - result: the sales disposition — only meaningful once callStatus is
//   "showed" (you can't have a result if they didn't show)
// Logging either is what *drives* the lead's stage forward (see
// CALL_STATUS_TO_STAGE / CALL_RESULT_TO_STAGE below), neither is the stage
// itself. A call can sit at callStatus="showed" with result still null —
// that's Fathom's "pending disposition" placeholder (or a rep logging
// attendance before filling in what happened); logging the result
// afterward finishes that same row instead of adding a second one.

export const CALL_STATUSES = ["booked", "showed", "no_show", "cancelled", "rescheduled"] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  booked: "Booked",
  showed: "Showed",
  no_show: "No-Show",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

export const CALL_RESULTS = ["closed_won", "closed_lost", "follow_up", "not_qualified"] as const;
export type CallResult = (typeof CALL_RESULTS)[number];

export const CALL_RESULT_LABELS: Record<CallResult, string> = {
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  follow_up: "Follow-up",
  not_qualified: "Not Qualified",
};

/** Logging a call status moves the lead's stage — `null` means don't touch
 *  the stage (a cancellation or reschedule tells us nothing new about where
 *  the lead stands). Overridden by CALL_RESULT_TO_STAGE once a result is
 *  logged, since the result is more specific. */
export const CALL_STATUS_TO_STAGE: Record<CallStatus, LeadStage | null> = {
  booked: "booked",
  showed: "showed",
  no_show: "no_show",
  cancelled: null,
  rescheduled: null,
};

export const CALL_RESULT_TO_STAGE: Record<CallResult, LeadStage> = {
  closed_won: "closed_won",
  closed_lost: "closed_lost",
  follow_up: "showed",
  not_qualified: "closed_lost",
};

/** Auto-derived loss reason when the rep didn't type one — editable, not enforced. */
export const RESULT_LOSS_REASON: Partial<Record<CallResult, string>> = {
  not_qualified: "Not qualified",
};

/** A call is worth debriefing once it has actually happened — showed
 *  (whatever the result) or no-show. A call that's only booked, cancelled,
 *  or rescheduled hasn't happened yet, so there's nothing to reflect on. */
export const DEBRIEFABLE_CALL_STATUSES: CallStatus[] = ["showed", "no_show"];

/** One label for a call row: just the status, or "Status → Result" once a
 *  result has been logged. */
export function callOutcomeLabel(callStatus: string, result: string | null | undefined): string {
  const statusLabel = CALL_STATUS_LABELS[callStatus as CallStatus] ?? callStatus;
  if (!result) return statusLabel;
  const resultLabel = CALL_RESULT_LABELS[result as CallResult] ?? result;
  return `${statusLabel} → ${resultLabel}`;
}

// Post-call debrief vocabulary — the CLOSER framework step where the call
// felt weakest, the real category behind the final objection, and the one
// thing to blame when a call doesn't close.

export const CLOSER_STEPS = ["opening", "discovery", "diagnosis", "pitch", "close"] as const;
export type CloserStep = (typeof CLOSER_STEPS)[number];
export const CLOSER_STEP_LABELS: Record<CloserStep, string> = {
  opening: "Opening",
  discovery: "Discovery",
  diagnosis: "Diagnosis",
  pitch: "Pitch",
  close: "Close",
};

export const OBJECTION_TYPES = ["money", "belief", "trust", "timing", "other"] as const;
export type ObjectionType = (typeof OBJECTION_TYPES)[number];
export const OBJECTION_TYPE_LABELS: Record<ObjectionType, string> = {
  money: "Money / affordability",
  belief: "Belief (in the vehicle or themselves)",
  trust: "Trust (you / company)",
  timing: "Timing / priorities",
  other: "Something else",
};

export const ROOT_CAUSES = ["script", "skill", "lead"] as const;
export type RootCause = (typeof ROOT_CAUSES)[number];
export const ROOT_CAUSE_LABELS: Record<RootCause, string> = {
  script: "Script issue — the words are wrong or missing",
  skill: "Skill issue — tone, pace, listening, confidence",
  lead: "Lead issue — wrong person or bad fit",
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

/** Formats a Date as a `datetime-local` input value (`YYYY-MM-DDTHH:mm`) in
 *  Central European Time — so a "Date/time" field's default value reads
 *  consistently with formatCET regardless of server or viewer timezone. */
export function toBerlinDatetimeLocal(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

export { initialsOf as leadInitials };
