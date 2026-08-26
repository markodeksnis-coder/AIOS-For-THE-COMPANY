// Shared between every route that triggers the Sales agent to draft a
// follow-up on a specific trigger (the per-lead button, and the AI Follow-up
// Sweep) — one instruction set, not copies drifting apart.

// The Inside Sales CRM only has one agent working it today — if more sales
// agents show up later this could become a lookup, but for now there's
// nothing to disambiguate.
export const SALES_AGENT_SLUG = "head-of-sales";

export type FollowUpDraftKind = "no_show_followup" | "closed_lost_followup";

export const DRAFT_INSTRUCTIONS: Record<FollowUpDraftKind, string> = {
  no_show_followup:
    "This lead didn't show for their booked call. Use get_lead to pull their full detail and call history, then write a personalized email AND a personalized text message to get them to reschedule and show up — reference specifics about them, don't write generic copy. Save each with save_lead_draft (kind: no_show_followup).",
  closed_lost_followup:
    "This lead showed up but didn't buy. Use get_lead to pull their full detail and call history (check the loss reason, root cause, and objection type from the debrief). Classify their lead temperature (hot/warm/general/disqualified — see the sequence index in your instructions), call get_follow_up_sequence for the matching sequence, then write a personalized Loom video script (what to say on camera) AND a personalized text message grounded in that sequence's real copy — fill in its placeholders from the actual call, don't paste it verbatim. Save each with save_lead_draft (kind: closed_lost_followup, sequenceId/sequenceDay set to what you used).",
};
