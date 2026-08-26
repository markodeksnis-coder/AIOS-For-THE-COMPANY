import { describe, it, expect } from "vitest";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  STAGE_DEFAULT_PROBABILITY,
  LEAD_STAGE_STYLE,
  CALL_STATUSES,
  CALL_STATUS_LABELS,
  CALL_STATUS_TO_STAGE,
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  CALL_RESULT_TO_STAGE,
  callOutcomeLabel,
  formatCET,
  toBerlinDatetimeLocal,
  initialsOf,
} from "./crm";

// This app changed its pipeline stage list once already this session (7
// stages down to 5) and had to hand-update four separate lookup maps to
// match — these guard against the next such change silently forgetting
// one of them.
describe("stage/result vocabulary consistency", () => {
  it("every LeadStage has a label, a default probability, and a style", () => {
    for (const stage of LEAD_STAGES) {
      expect(LEAD_STAGE_LABELS[stage], `label for ${stage}`).toBeTypeOf("string");
      expect(STAGE_DEFAULT_PROBABILITY[stage], `probability for ${stage}`).toBeTypeOf("number");
      expect(LEAD_STAGE_STYLE[stage], `style for ${stage}`).toBeDefined();
    }
  });

  it("every CallStatus has a label and a stage mapping entry", () => {
    for (const status of CALL_STATUSES) {
      expect(CALL_STATUS_LABELS[status], `label for ${status}`).toBeTypeOf("string");
      expect(status in CALL_STATUS_TO_STAGE, `CALL_STATUS_TO_STAGE has ${status}`).toBe(true);
    }
  });

  it("every CallResult has a label and maps to a real LeadStage", () => {
    for (const result of CALL_RESULTS) {
      expect(CALL_RESULT_LABELS[result], `label for ${result}`).toBeTypeOf("string");
      expect(LEAD_STAGES as readonly string[], `${result} maps to a real stage`).toContain(
        CALL_RESULT_TO_STAGE[result]
      );
    }
  });
});

describe("callOutcomeLabel", () => {
  it("shows just the status when there's no result yet", () => {
    expect(callOutcomeLabel("booked", null)).toBe("Booked");
    expect(callOutcomeLabel("showed", undefined)).toBe("Showed");
  });

  it("shows status → result once a result is logged", () => {
    expect(callOutcomeLabel("showed", "closed_won")).toBe("Showed → Closed Won");
    expect(callOutcomeLabel("showed", "not_qualified")).toBe("Showed → Not Qualified");
  });

  it("falls back to the raw string for an unrecognized status/result", () => {
    expect(callOutcomeLabel("some_future_status", null)).toBe("some_future_status");
    expect(callOutcomeLabel("showed", "some_future_result")).toBe("Showed → some_future_result");
  });
});

describe("formatCET / toBerlinDatetimeLocal", () => {
  // 2026-01-15T10:30:00Z is deep in winter — CET (UTC+1), well clear of any
  // DST transition, so this is a stable fixed point rather than one that
  // could flip CET/CEST depending on when the test runs.
  const winterUtc = new Date("2026-01-15T10:30:00Z");

  it("formats in Central European Time regardless of the runner's own timezone", () => {
    const formatted = formatCET(winterUtc);
    expect(formatted).toContain("15 Jan");
    expect(formatted).toContain("11:30"); // UTC+1 in winter
    expect(formatted).toContain("CET");
  });

  it("produces a datetime-local value consistent with formatCET's own time", () => {
    expect(toBerlinDatetimeLocal(winterUtc)).toBe("2026-01-15T11:30");
  });

  it("switches to CEST in summer", () => {
    const summerUtc = new Date("2026-07-15T10:30:00Z");
    expect(formatCET(summerUtc)).toContain("CEST");
    expect(toBerlinDatetimeLocal(summerUtc)).toBe("2026-07-15T12:30"); // UTC+2 in summer
  });
});

describe("initialsOf", () => {
  it("takes the first letter of up to two words, uppercased", () => {
    expect(initialsOf("Josh Kennedy")).toBe("JK");
    expect(initialsOf("marko deksnis")).toBe("MD");
  });

  it("uses just one letter for a single name", () => {
    expect(initialsOf("Cher")).toBe("C");
  });

  it("ignores a third+ word", () => {
    expect(initialsOf("Mary Jane Watson")).toBe("MJ");
  });

  it("falls back to '?' for an empty or whitespace-only name", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});
