// Typed access to follow-up-sequences.json — the actual copy lives in that
// JSON file so it can be edited without touching code. This file only adds
// types and a couple of lookup helpers on top.

import data from "./follow-up-sequences.json";

export type FollowUpChannel = "email" | "sms" | "flexible" | "dm" | "social";

export type FollowUpMessage = {
  day: number | string | null;
  channel: FollowUpChannel;
  subject?: string;
  body: string;
  label?: string;
  variant?: string;
  notes?: string;
};

export type FollowUpSequence = {
  id: string;
  name: string;
  useWhen: string;
  goal?: string;
  notes?: string;
  timing?: string;
  frequency?: string;
  how?: string;
  components?: {
    openers: string[];
    bodyExamples: string[];
    ctas: string[];
  };
  messages: FollowUpMessage[];
};

export type LeadTemperatureStage = {
  id: string;
  label: string;
  definition: string;
};

export type PostCallLoomSop = {
  steps: string[];
  loomTemplates: { id: string; name: string; url: string }[];
  links: { bookFollowUpCall: string; stripePayment3k: string };
};

const typedData = data as {
  leadTemperatureStages: LeadTemperatureStage[];
  sequenceRouting: Record<string, string | null> & { notes: string };
  sequences: FollowUpSequence[];
  postCallLoomSop: PostCallLoomSop;
};

export const LEAD_TEMPERATURE_STAGES = typedData.leadTemperatureStages;
export const SEQUENCE_ROUTING = typedData.sequenceRouting;
export const FOLLOW_UP_SEQUENCES = typedData.sequences;
export const POST_CALL_LOOM_SOP = typedData.postCallLoomSop;

export function getFollowUpSequence(id: string): FollowUpSequence | undefined {
  return FOLLOW_UP_SEQUENCES.find((s) => s.id === id);
}
