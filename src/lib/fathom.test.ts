import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyFathomSignature,
  signFathomPayload,
  recordingIdFrom,
  recordingUrlFrom,
  summaryTextFrom,
  inviteesFrom,
  inviteeEmailsFrom,
  callDateFrom,
  callStartedAtFrom,
  transcriptTextFrom,
} from "@/lib/fathom";

const SIGNING_KEY = "whsec_dGVzdHNlY3JldGtleWZvcnRlc3Rpbmc=";

describe("verifyFathomSignature / signFathomPayload", () => {
  it("verifies a signature it just generated", () => {
    const raw = JSON.stringify({ type: "recording.completed" });
    const headers = signFathomPayload(raw, SIGNING_KEY);
    expect(verifyFathomSignature(raw, headers, SIGNING_KEY)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const raw = JSON.stringify({ type: "recording.completed" });
    const headers = signFathomPayload(raw, SIGNING_KEY);
    expect(verifyFathomSignature(raw + "tampered", headers, SIGNING_KEY)).toBe(false);
  });

  it("rejects a signature made with the wrong key", () => {
    const raw = JSON.stringify({ type: "recording.completed" });
    const headers = signFathomPayload(raw, "whsec_d3JvbmdrZXk=");
    expect(verifyFathomSignature(raw, headers, SIGNING_KEY)).toBe(false);
  });

  it("rejects when any header is missing", () => {
    expect(verifyFathomSignature("{}", { id: null, timestamp: "1", signature: "v1,x" }, SIGNING_KEY)).toBe(false);
    expect(verifyFathomSignature("{}", { id: "x", timestamp: null, signature: "v1,x" }, SIGNING_KEY)).toBe(false);
    expect(verifyFathomSignature("{}", { id: "x", timestamp: "1", signature: null }, SIGNING_KEY)).toBe(false);
  });

  it("rejects a stale timestamp", () => {
    const raw = "{}";
    const oldTimestamp = String(Math.floor(Date.now() / 1000) - 10 * 60);
    const key = Buffer.from(SIGNING_KEY.replace(/^whsec_/, ""), "base64");
    const sig = createHmac("sha256", key).update(`old-id.${oldTimestamp}.${raw}`).digest("base64");
    expect(verifyFathomSignature(raw, { id: "old-id", timestamp: oldTimestamp, signature: `v1,${sig}` }, SIGNING_KEY)).toBe(false);
  });

  it("matches any one of several space-separated v1 candidates", () => {
    const raw = "{}";
    const headers = signFathomPayload(raw, SIGNING_KEY);
    const multi = { ...headers, signature: `v1,not-the-real-one ${headers.signature}` };
    expect(verifyFathomSignature(raw, multi, SIGNING_KEY)).toBe(true);
  });
});

describe("recordingIdFrom / recordingUrlFrom / summaryTextFrom", () => {
  it("prefers recording_id, falls back to id", () => {
    expect(recordingIdFrom({ recording_id: 123, id: 456 })).toBe("123");
    expect(recordingIdFrom({ id: 456 })).toBe("456");
    expect(recordingIdFrom({})).toBeNull();
  });

  it("prefers url, falls back to share_url", () => {
    expect(recordingUrlFrom({ url: "https://a", share_url: "https://b" })).toBe("https://a");
    expect(recordingUrlFrom({ share_url: "https://b" })).toBe("https://b");
    expect(recordingUrlFrom({})).toBeNull();
  });

  it("reads default_summary's markdown_formatted, falling back to text, falling back to summary", () => {
    expect(summaryTextFrom({ default_summary: { markdown_formatted: "**bold**", text: "plain" } })).toBe("**bold**");
    expect(summaryTextFrom({ default_summary: { text: "plain" } })).toBe("plain");
    expect(summaryTextFrom({ default_summary: "a plain string" })).toBe("a plain string");
    expect(summaryTextFrom({ summary: "fallback summary" })).toBe("fallback summary");
    expect(summaryTextFrom({})).toBeNull();
  });
});

describe("inviteesFrom / inviteeEmailsFrom", () => {
  it("excludes whoever recorded the call", () => {
    const payload = {
      recorded_by: { email: "rep@company.com" },
      calendar_invitees: [
        { name: "Rep", email: "rep@company.com" },
        { name: "Prospect", email: "prospect@example.com" },
      ],
    };
    expect(inviteesFrom(payload).map((i) => i.email)).toEqual(["prospect@example.com"]);
  });

  it("de-duplicates invitees by email (case-insensitive)", () => {
    const payload = {
      calendar_invitees: [
        { name: "Josh", email: "Josh@Example.com" },
        { name: "Josh Again", email: "josh@example.com" },
      ],
    };
    expect(inviteesFrom(payload)).toHaveLength(1);
  });

  it("de-duplicates a no-email invitee by name", () => {
    const payload = {
      calendar_invitees: [
        { name: "Josh", email: null },
        { name: "Josh", email: null },
      ],
    };
    expect(inviteesFrom(payload)).toHaveLength(1);
  });

  it("returns an empty array when calendar_invitees is missing", () => {
    expect(inviteesFrom({})).toEqual([]);
  });

  it("inviteeEmailsFrom extracts only the ones with an email", () => {
    const payload = {
      calendar_invitees: [
        { name: "Josh", email: "josh@example.com" },
        { name: "No Email", email: null },
      ],
    };
    expect(inviteeEmailsFrom(payload)).toEqual(["josh@example.com"]);
  });
});

describe("callDateFrom / callStartedAtFrom", () => {
  it("prefers recording_start_time, falls back to scheduled_start_time", () => {
    expect(callDateFrom({ recording_start_time: "2026-06-15T14:00:00Z", scheduled_start_time: "2026-01-01T00:00:00Z" })).toBe(
      "2026-06-15"
    );
    expect(callDateFrom({ scheduled_start_time: "2026-01-01T00:00:00Z" })).toBe("2026-01-01");
  });

  it("falls back to today when no timestamp is present or it's unparseable", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(callDateFrom({})).toBe(today);
    expect(callDateFrom({ recording_start_time: "not-a-date" })).toBe(today);
  });

  it("callStartedAtFrom returns null (not 'now') when no timestamp is usable", () => {
    expect(callStartedAtFrom({})).toBeNull();
    expect(callStartedAtFrom({ recording_start_time: "not-a-date" })).toBeNull();
  });

  it("callStartedAtFrom returns the real Date when a timestamp is present", () => {
    const result = callStartedAtFrom({ recording_start_time: "2026-06-15T14:00:00Z" });
    expect(result?.toISOString()).toBe("2026-06-15T14:00:00.000Z");
  });
});

describe("transcriptTextFrom", () => {
  it("returns null when there's no transcript", () => {
    expect(transcriptTextFrom({})).toBeNull();
    expect(transcriptTextFrom({ transcript: null })).toBeNull();
  });

  it("returns a plain string transcript trimmed, or null if it's blank", () => {
    expect(transcriptTextFrom({ transcript: "  hello  " })).toBe("hello");
    expect(transcriptTextFrom({ transcript: "   " })).toBeNull();
  });

  it("formats structured segments as 'Speaker: line', preferring speaker_name over speaker", () => {
    const result = transcriptTextFrom({
      transcript: [
        { speaker_name: "Josh Kennedy", speaker: "spk_1", text: "Hi there" },
        { speaker: "spk_2", text: "Hello" },
        { speaker: null, text: "no speaker at all" },
      ],
    });
    expect(result).toBe("Josh Kennedy: Hi there\nspk_2: Hello\nno speaker at all");
  });

  it("skips segments with no usable text and returns null if none remain", () => {
    expect(transcriptTextFrom({ transcript: [{ speaker: "a", text: "" }, { speaker: "b", text: "   " }] })).toBeNull();
  });

  it("returns null for a transcript shape that's neither a string nor an array", () => {
    expect(transcriptTextFrom({ transcript: 12345 as unknown as string })).toBeNull();
  });
});
