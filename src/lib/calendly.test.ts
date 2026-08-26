import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  parseQualificationAnswers,
  phoneFromAnswers,
  verifyCalendlySignature,
  eventUriFrom,
  oldInviteeUriFrom,
} from "./calendly";

// Regression coverage for two real bugs found and fixed against Marko's
// actual live Calendly booking form this session — a "revenue goal"
// question was silently overwriting "current monthly revenue" (keyword
// collision), and a range-style radio answer like "$1k - $5k /mo" was
// being digit-concatenated into garbage instead of averaged.
describe("parseQualificationAnswers", () => {
  it("parses a plain number answer", () => {
    const result = parseQualificationAnswers([{ question: "Current Monthly Revenue", answer: "12000" }]);
    expect(result.monthlyRevenue).toBe(12000);
  });

  it("averages a k-suffixed range answer instead of concatenating digits", () => {
    const result = parseQualificationAnswers([{ question: "Current Monthly Revenue", answer: "$1k - $5k /mo" }]);
    expect(result.monthlyRevenue).toBe(3000);
  });

  it("only matches 'monthly revenue', not a separate 'revenue goal' question", () => {
    const result = parseQualificationAnswers([
      { question: "Current Monthly Revenue", answer: "10000" },
      { question: "What's your revenue goal for next year?", answer: "50000" },
    ]);
    expect(result.monthlyRevenue).toBe(10000);
  });

  it("matches years-running-agency by keyword and parses it as a number", () => {
    const result = parseQualificationAnswers([{ question: "How long have you been running your agency?", answer: "3" }]);
    expect(result.yearsRunningAgency).toBe(3);
  });

  it("captures free-text fields (location, IG/LinkedIn, sells service) verbatim", () => {
    const result = parseQualificationAnswers([
      { question: "Where are you based?", answer: " Austin, TX " },
      { question: "Instagram handle", answer: "@founder" },
      { question: "Do you currently sell paid ads?", answer: "Yes" },
    ]);
    expect(result.location).toBe("Austin, TX");
    expect(result.instagramOrLinkedin).toBe("@founder");
    expect(result.sellsService).toBe("Yes");
  });

  it("skips blank answers and questions matching no known field", () => {
    const result = parseQualificationAnswers([
      { question: "Current Monthly Revenue", answer: "   " },
      { question: "Favorite color?", answer: "blue" },
    ]);
    expect(result).toEqual({});
  });
});

describe("phoneFromAnswers", () => {
  it("finds a phone number from a custom question by keyword", () => {
    expect(phoneFromAnswers([{ question: "Best mobile number to reach you?", answer: "555-0100" }])).toBe(
      "555-0100"
    );
  });

  it("returns undefined when no question matches", () => {
    expect(phoneFromAnswers([{ question: "Where are you based?", answer: "Austin" }])).toBeUndefined();
  });
});

describe("verifyCalendlySignature", () => {
  const signingKey = "test-signing-key";
  const rawBody = '{"event":"invitee.created"}';

  function sign(timestamp: number, body: string, key: string) {
    return createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex");
  }

  it("accepts a freshly-signed request", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign(timestamp, rawBody, signingKey);
    const header = `t=${timestamp},v1=${signature}`;
    expect(verifyCalendlySignature(rawBody, header, signingKey)).toBe(true);
  });

  it("rejects a signature made with the wrong key", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign(timestamp, rawBody, "wrong-key");
    const header = `t=${timestamp},v1=${signature}`;
    expect(verifyCalendlySignature(rawBody, header, signingKey)).toBe(false);
  });

  it("rejects a signature for a body that was tampered with", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign(timestamp, rawBody, signingKey);
    const header = `t=${timestamp},v1=${signature}`;
    expect(verifyCalendlySignature('{"event":"invitee.canceled"}', header, signingKey)).toBe(false);
  });

  it("rejects a stale signature outside the freshness window", () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 10 * 60; // 10 minutes old
    const signature = sign(staleTimestamp, rawBody, signingKey);
    const header = `t=${staleTimestamp},v1=${signature}`;
    expect(verifyCalendlySignature(rawBody, header, signingKey)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyCalendlySignature(rawBody, null, signingKey)).toBe(false);
    expect(verifyCalendlySignature(rawBody, "not,a,valid,header", signingKey)).toBe(false);
  });
});

describe("eventUriFrom / oldInviteeUriFrom", () => {
  it("reads a plain string event/old_invitee field", () => {
    expect(eventUriFrom({ event: "https://api.calendly.com/scheduled_events/abc" })).toBe(
      "https://api.calendly.com/scheduled_events/abc"
    );
    expect(oldInviteeUriFrom({ old_invitee: "https://api.calendly.com/invitees/xyz" })).toBe(
      "https://api.calendly.com/invitees/xyz"
    );
  });

  it("unwraps a nested { uri } object", () => {
    expect(eventUriFrom({ event: { uri: "https://api.calendly.com/scheduled_events/abc" } })).toBe(
      "https://api.calendly.com/scheduled_events/abc"
    );
  });

  it("returns null when the field is absent", () => {
    expect(eventUriFrom({})).toBeNull();
    expect(oldInviteeUriFrom({})).toBeNull();
  });
});
