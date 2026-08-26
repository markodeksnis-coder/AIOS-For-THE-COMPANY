import { describe, it, expect, vi, beforeEach } from "vitest";
import { signFathomPayload } from "@/lib/fathom";

// Prisma is a singleton import (`db` from "@/lib/db") — mock the module so
// processFathomWebhook's DB calls hit these vi.fn()s instead of a real
// database. $transaction just invokes its callback with the same mock
// object, so calls made through `tx` inside the transaction are recorded
// on the same spies as calls made directly on `db`.
const dbMock = vi.hoisted(() => ({
  lead: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  salesCall: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  unmatchedCall: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  webhookEvent: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

const { processFathomWebhook } = await import("@/lib/fathom-webhook");

const SIGNING_KEY = "whsec_dGVzdHNlY3JldGtleWZvcnRlc3Rpbmc=";

function sign(rawBody: string) {
  return signFathomPayload(rawBody, SIGNING_KEY);
}

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    type: "recording.completed",
    recording_id: 12345,
    url: "https://fathom.video/calls/12345",
    recording_start_time: "2026-06-15T14:00:00Z",
    recorded_by: { email: "rep@company.com" },
    calendar_invitees: [{ name: "Josh Kennedy", email: "josh@example.com", phone: null }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FATHOM_WEBHOOK_SIGNING_KEY = SIGNING_KEY;
  dbMock.$transaction.mockImplementation(async (cb: (tx: typeof dbMock) => unknown) => cb(dbMock));
  dbMock.webhookEvent.create.mockResolvedValue({});
  dbMock.lead.findFirst.mockResolvedValue(null);
  dbMock.lead.findMany.mockResolvedValue([]);
  dbMock.salesCall.findUnique.mockResolvedValue(null);
  dbMock.salesCall.findFirst.mockResolvedValue(null);
  dbMock.unmatchedCall.findUnique.mockResolvedValue(null);
});

describe("processFathomWebhook — signature/payload validation", () => {
  it("503s when FATHOM_WEBHOOK_SIGNING_KEY isn't configured", async () => {
    delete process.env.FATHOM_WEBHOOK_SIGNING_KEY;
    const raw = JSON.stringify(basePayload());
    const result = await processFathomWebhook(raw, { id: "x", timestamp: "1", signature: "v1,abc" });
    expect(result.status).toBe(503);
  });

  it("401s on an invalid signature", async () => {
    const raw = JSON.stringify(basePayload());
    const result = await processFathomWebhook(raw, { id: "wrong", timestamp: "1", signature: "v1,bad" });
    expect(result.status).toBe(401);
  });

  it("400s on a body that isn't valid JSON", async () => {
    const raw = "not json";
    const headers = sign(raw);
    const result = await processFathomWebhook(raw, headers);
    expect(result.status).toBe(400);
  });

  it("is a 200 no-op when there's no external invitee", async () => {
    const raw = JSON.stringify(basePayload({ calendar_invitees: [] }));
    const result = await processFathomWebhook(raw, sign(raw));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ matched: false });
    expect(dbMock.lead.findFirst).not.toHaveBeenCalled();
  });
});

describe("processFathomWebhook — matched lead", () => {
  it("creates a new SalesCall and advances an open-stage lead to 'showed'", async () => {
    dbMock.lead.findFirst.mockImplementation(async ({ where }: { where: { email?: string } }) =>
      where.email === "josh@example.com" ? { id: "lead1", name: "Josh Kennedy", stage: "booked" } : null
    );
    const raw = JSON.stringify(basePayload());
    const result = await processFathomWebhook(raw, sign(raw));

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ matched: true, leadId: "lead1" });
    expect(dbMock.salesCall.create).toHaveBeenCalledTimes(1);
    expect(dbMock.salesCall.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ leadId: "lead1", callStatus: "showed", fathomRecordingId: "12345" }) })
    );
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lead1" }, data: expect.objectContaining({ stage: "showed" }) })
    );
  });

  it("does not downgrade a lead already past 'booked' (e.g. closed_won)", async () => {
    dbMock.lead.findFirst.mockImplementation(async ({ where }: { where: { email?: string } }) =>
      where.email === "josh@example.com" ? { id: "lead1", name: "Josh Kennedy", stage: "closed_won" } : null
    );
    const raw = JSON.stringify(basePayload());
    await processFathomWebhook(raw, sign(raw));

    expect(dbMock.salesCall.create).toHaveBeenCalledTimes(1);
    expect(dbMock.lead.update).not.toHaveBeenCalled();
  });

  it("finishes an existing pending 'booked' call instead of creating a second one", async () => {
    dbMock.lead.findFirst.mockImplementation(async ({ where }: { where: { email?: string } }) =>
      where.email === "josh@example.com" ? { id: "lead1", name: "Josh Kennedy", stage: "booked" } : null
    );
    dbMock.salesCall.findFirst.mockResolvedValue({ id: "call-pending", leadId: "lead1", callStatus: "booked", result: null });
    const raw = JSON.stringify(basePayload());
    await processFathomWebhook(raw, sign(raw));

    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "call-pending" }, data: expect.objectContaining({ callStatus: "showed" }) })
    );
  });

  it("updates the existing SalesCall row on an idempotent retry (same recordingId)", async () => {
    dbMock.lead.findFirst.mockImplementation(async ({ where }: { where: { email?: string } }) =>
      where.email === "josh@example.com" ? { id: "lead1", name: "Josh Kennedy", stage: "showed" } : null
    );
    dbMock.salesCall.findUnique.mockResolvedValue({ id: "call-existing", fathomRecordingId: "12345" });
    const raw = JSON.stringify(basePayload());
    await processFathomWebhook(raw, sign(raw));

    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "call-existing" } }));
  });

  it("matches by phone when no email matches", async () => {
    dbMock.lead.findFirst.mockImplementation(async ({ where }: { where: { email?: string; phone?: string } }) => {
      if (where.phone === "+15551234567") return { id: "lead2", name: "Josh Kennedy", stage: "booked" };
      return null;
    });
    const raw = JSON.stringify(
      basePayload({ calendar_invitees: [{ name: "Josh Kennedy", email: null, phone: "+15551234567" }] })
    );
    const result = await processFathomWebhook(raw, sign(raw));
    expect(result.body).toMatchObject({ matched: true, leadId: "lead2" });
  });
});

describe("processFathomWebhook — no match", () => {
  it("creates an UnmatchedCall when no lead matches", async () => {
    const raw = JSON.stringify(basePayload());
    const result = await processFathomWebhook(raw, sign(raw));

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ matched: false, unmatched: true });
    expect(dbMock.unmatchedCall.create).toHaveBeenCalledTimes(1);
  });

  it("updates the existing UnmatchedCall row on a retry instead of duplicating it", async () => {
    dbMock.unmatchedCall.findUnique.mockResolvedValue({ id: "unmatched1", fathomRecordingId: "12345" });
    const raw = JSON.stringify(basePayload());
    await processFathomWebhook(raw, sign(raw));

    expect(dbMock.unmatchedCall.create).not.toHaveBeenCalled();
    expect(dbMock.unmatchedCall.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "unmatched1" } }));
  });
});
