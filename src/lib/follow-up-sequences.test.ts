import { describe, it, expect } from "vitest";
import { FOLLOW_UP_SEQUENCES, LEAD_TEMPERATURE_STAGES, SEQUENCE_ROUTING, getFollowUpSequence } from "./follow-up-sequences";

describe("getFollowUpSequence", () => {
  it("finds a real sequence by id", () => {
    const seq = getFollowUpSequence("warm_list_sop");
    expect(seq).toBeDefined();
    expect(seq?.name).toContain("Warm List");
    expect(seq?.messages.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown id", () => {
    expect(getFollowUpSequence("does_not_exist")).toBeUndefined();
  });

  it("every sequence has at least one message with real body text", () => {
    for (const seq of FOLLOW_UP_SEQUENCES) {
      expect(seq.messages.length, `${seq.id} has messages`).toBeGreaterThan(0);
      for (const msg of seq.messages) {
        expect(msg.body.trim().length, `${seq.id} message body is non-empty`).toBeGreaterThan(0);
      }
    }
  });
});

// The Sales agent's system prompt (src/lib/agent-runtime.ts) builds a
// sequence index straight off sequenceRouting's non-null values — this
// guards against that routing table ever pointing at a sequence id that
// doesn't actually exist in the sequences array.
describe("sequenceRouting integrity", () => {
  it("every non-null routing target is a real sequence id", () => {
    const realIds = new Set(FOLLOW_UP_SEQUENCES.map((s) => s.id));
    for (const [key, target] of Object.entries(SEQUENCE_ROUTING)) {
      if (key === "notes" || target === null) continue;
      expect(realIds.has(target as string), `routing "${key}" -> "${target}" is a real sequence`).toBe(true);
    }
  });
});

describe("leadTemperatureStages", () => {
  it("every stage has a non-empty id, label, and definition", () => {
    for (const stage of LEAD_TEMPERATURE_STAGES) {
      expect(stage.id.length).toBeGreaterThan(0);
      expect(stage.label.length).toBeGreaterThan(0);
      expect(stage.definition.length).toBeGreaterThan(0);
    }
  });
});
