import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Same db-mocking approach as the other actions/*.test.ts files in this
// directory. signFathomPayload/processFathomWebhook are mocked outright —
// their own logic is covered by fathom.test.ts and fathom-webhook.test.ts;
// this file only exercises webhooks.ts's own wiring (lookups, the
// assign-to-lead transaction, revalidation paths).
const dbMock = vi.hoisted(() => ({
  lead: { findUnique: vi.fn(), update: vi.fn() },
  unmatchedCall: { findUnique: vi.fn(), delete: vi.fn() },
  salesCall: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
}));

const revalidatePathMock = vi.hoisted(() => vi.fn());
const signFathomPayloadMock = vi.hoisted(() => vi.fn());
const processFathomWebhookMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/fathom", () => ({ signFathomPayload: signFathomPayloadMock }));
vi.mock("@/lib/fathom-webhook", () => ({ processFathomWebhook: processFathomWebhookMock }));

const { fireFathomTestEvent, assignUnmatchedCall, dismissUnmatchedCall } = await import("@/lib/actions/webhooks");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("FATHOM_WEBHOOK_SIGNING_KEY", "test-signing-key");
  signFathomPayloadMock.mockReturnValue({ id: "sig-id", timestamp: "123", signature: "sig" });
  processFathomWebhookMock.mockResolvedValue({ status: 200, body: { matched: true } });
  dbMock.$transaction.mockImplementation(async (cb: (tx: typeof dbMock) => unknown) => cb(dbMock));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fireFathomTestEvent", () => {
  it("throws when FATHOM_WEBHOOK_SIGNING_KEY isn't configured", async () => {
    vi.stubEnv("FATHOM_WEBHOOK_SIGNING_KEY", "");
    await expect(fireFathomTestEvent()).rejects.toThrow("FATHOM_WEBHOOK_SIGNING_KEY isn't configured");
    expect(processFathomWebhookMock).not.toHaveBeenCalled();
  });

  it("fires a synthetic unmatched-call event when no leadId is given", async () => {
    const result = await fireFathomTestEvent();
    expect(dbMock.lead.findUnique).not.toHaveBeenCalled();
    expect(processFathomWebhookMock).toHaveBeenCalledWith(expect.any(String), { id: "sig-id", timestamp: "123", signature: "sig" }, { isTest: true });
    expect(result).toEqual({ status: 200, matched: true });
  });

  it("throws when the given leadId doesn't exist", async () => {
    dbMock.lead.findUnique.mockResolvedValue(null);
    await expect(fireFathomTestEvent("lead1")).rejects.toThrow("Lead not found");
  });

  it("throws when the lead has no email on file", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "lead1", name: "Jordan Blake", email: null });
    await expect(fireFathomTestEvent("lead1")).rejects.toThrow("Jordan Blake has no email on file");
  });

  it("builds the payload from the real lead's name/email when leadId matches", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "lead1", name: "Jordan Blake", email: "jordan@example.com" });
    await fireFathomTestEvent("lead1");
    const rawBody = processFathomWebhookMock.mock.calls[0][0];
    const payload = JSON.parse(rawBody);
    const externalInvitee = payload.calendar_invitees.find((i: { is_external: boolean }) => i.is_external);
    expect(externalInvitee).toEqual(expect.objectContaining({ name: "Jordan Blake", email: "jordan@example.com" }));
  });

  it("revalidates the lead's own page only when a leadId was given", async () => {
    await fireFathomTestEvent();
    expect(revalidatePathMock).not.toHaveBeenCalledWith("/sales/crm/lead1");

    dbMock.lead.findUnique.mockResolvedValue({ id: "lead1", name: "Jordan Blake", email: "jordan@example.com" });
    await fireFathomTestEvent("lead1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/lead1");
  });
});

describe("assignUnmatchedCall", () => {
  const unmatched = {
    id: "unmatched1",
    scheduledAt: "2026-06-15",
    startedAt: new Date("2026-06-15T14:00:00Z"),
    recordingLink: "https://fathom.video/calls/1",
    aiSummary: "Summary",
    transcript: "Transcript",
    fathomRecordingId: "rec1",
  };

  beforeEach(() => {
    dbMock.unmatchedCall.findUnique.mockResolvedValue(unmatched);
    dbMock.lead.findUnique.mockResolvedValue({ id: "lead1", stage: "booked" });
    dbMock.salesCall.findUnique.mockResolvedValue(null);
  });

  it("throws when the unmatched call doesn't exist", async () => {
    dbMock.unmatchedCall.findUnique.mockResolvedValue(null);
    await expect(assignUnmatchedCall("unmatched1", "lead1")).rejects.toThrow("Unmatched call not found");
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("throws when the target lead doesn't exist", async () => {
    dbMock.lead.findUnique.mockResolvedValue(null);
    await expect(assignUnmatchedCall("unmatched1", "lead1")).rejects.toThrow("Lead not found");
  });

  it("creates a new SalesCall when no existing call matches the recording id", async () => {
    await assignUnmatchedCall("unmatched1", "lead1");
    expect(dbMock.salesCall.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ leadId: "lead1", callStatus: "showed", fathomRecordingId: "rec1" }),
      })
    );
    expect(dbMock.salesCall.update).not.toHaveBeenCalled();
  });

  it("updates the existing SalesCall instead of creating a duplicate when the recording id already matched one", async () => {
    dbMock.salesCall.findUnique.mockResolvedValue({ id: "call1" });
    await assignUnmatchedCall("unmatched1", "lead1");
    expect(dbMock.salesCall.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "call1" }, data: expect.objectContaining({ leadId: "lead1" }) })
    );
    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
  });

  it("bumps the lead's stage to showed when it was still in an open stage", async () => {
    await assignUnmatchedCall("unmatched1", "lead1");
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lead1" }, data: expect.objectContaining({ stage: "showed" }) })
    );
  });

  it("leaves the lead's stage untouched when it's already past the open stages", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "lead1", stage: "closed_won" });
    await assignUnmatchedCall("unmatched1", "lead1");
    expect(dbMock.lead.update).not.toHaveBeenCalled();
  });

  it("deletes the unmatched call and revalidates the relevant pages", async () => {
    await assignUnmatchedCall("unmatched1", "lead1");
    expect(dbMock.unmatchedCall.delete).toHaveBeenCalledWith({ where: { id: "unmatched1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/unmatched");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/lead1");
  });
});

describe("dismissUnmatchedCall", () => {
  it("deletes the unmatched call and revalidates the unmatched list", async () => {
    await dismissUnmatchedCall("unmatched1");
    expect(dbMock.unmatchedCall.delete).toHaveBeenCalledWith({ where: { id: "unmatched1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/unmatched");
  });
});
