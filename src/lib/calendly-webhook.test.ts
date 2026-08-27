import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

// Same mocking approach as fathom-webhook.test.ts — see that file's comment.
const dbMock = vi.hoisted(() => ({
  lead: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  salesCall: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  webhookEvent: { create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

const { processCalendlyWebhook } = await import("@/lib/calendly-webhook");

const SIGNING_KEY = "test-signing-key";

function sign(rawBody: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", SIGNING_KEY).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function invitePayload(event: "invitee.created" | "invitee.canceled", payload: Record<string, unknown> = {}) {
  return JSON.stringify({
    event,
    payload: {
      uri: "https://api.calendly.com/scheduled_events/abc/invitees/inv1",
      name: "Josh Kennedy",
      email: "josh@example.com",
      ...payload,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CALENDLY_WEBHOOK_SIGNING_KEY = SIGNING_KEY;
  delete process.env.CALENDLY_API_TOKEN; // skip the real fetchCalendlyEventStartTime network call
  dbMock.webhookEvent.create.mockResolvedValue({});
  dbMock.lead.findFirst.mockResolvedValue(null);
  dbMock.salesCall.findUnique.mockResolvedValue(null);
  dbMock.salesCall.upsert.mockResolvedValue({});
  dbMock.salesCall.updateMany.mockResolvedValue({ count: 0 });
  dbMock.lead.updateMany.mockResolvedValue({ count: 0 });
});

describe("processCalendlyWebhook — signature/payload validation", () => {
  it("503s when CALENDLY_WEBHOOK_SIGNING_KEY isn't configured", async () => {
    delete process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
    const raw = invitePayload("invitee.created");
    const result = await processCalendlyWebhook(raw, "t=1,v1=bad");
    expect(result.status).toBe(503);
  });

  it("401s on an invalid signature", async () => {
    const raw = invitePayload("invitee.created");
    const result = await processCalendlyWebhook(raw, "t=1,v1=deadbeef");
    expect(result.status).toBe(401);
  });

  it("400s on a body that isn't valid JSON", async () => {
    const raw = "not json";
    const result = await processCalendlyWebhook(raw, sign(raw));
    expect(result.status).toBe(400);
  });

  it("is a 200 no-op for an event type this endpoint doesn't handle", async () => {
    const raw = JSON.stringify({ event: "routing_form_submission.created", payload: {} });
    const result = await processCalendlyWebhook(raw, sign(raw));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ignored: "routing_form_submission.created" });
  });
});

describe("processCalendlyWebhook — invitee.created", () => {
  it("creates a new lead and a new booked SalesCall when no lead matches the email", async () => {
    const raw = invitePayload("invitee.created");
    dbMock.lead.create.mockResolvedValue({ id: "lead1", name: "Josh Kennedy" });

    const result = await processCalendlyWebhook(raw, sign(raw));

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, leadId: "lead1" });
    expect(dbMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: "josh@example.com", stage: "booked" }) })
    );
    // Goes through upsert (keyed on the unique calendlyInviteeUri), not a
    // plain create — see the race-safety test below for why.
    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { calendlyInviteeUri: "https://api.calendly.com/scheduled_events/abc/invitees/inv1" },
        create: expect.objectContaining({ leadId: "lead1", callStatus: "booked" }),
      })
    );
  });

  it("upserts instead of plain-creating the SalesCall, so a concurrent retry updates rather than crashing on the unique calendlyInviteeUri", async () => {
    // Simulates the actual race: two near-simultaneous deliveries for the
    // same invitee both see existingCall as null from their own findUnique
    // read (Calendly retries deliveries, and the network call to fetch the
    // event start time gives a real retry enough time to land mid-flight).
    // A plain create() here would throw P2002 on the second delivery,
    // surfacing as an unhandled 500 instead of the idempotent 200 the
    // endpoint is supposed to return for every retry.
    dbMock.lead.create.mockResolvedValue({ id: "lead1", name: "Josh Kennedy" });
    const raw = invitePayload("invitee.created");

    const result = await processCalendlyWebhook(raw, sign(raw));

    expect(result.status).toBe(200);
    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.upsert).toHaveBeenCalledTimes(1);
  });

  it("updates the existing lead by email instead of creating a duplicate", async () => {
    dbMock.lead.findFirst.mockResolvedValue({ id: "lead1", name: "Josh Kennedy", stage: "closed_lost" });
    dbMock.lead.update.mockResolvedValue({ id: "lead1", name: "Josh Kennedy" });
    const raw = invitePayload("invitee.created");

    await processCalendlyWebhook(raw, sign(raw));

    expect(dbMock.lead.create).not.toHaveBeenCalled();
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lead1" }, data: expect.objectContaining({ stage: "booked" }) })
    );
  });

  it("lowercases the invitee email before matching/storing, so a differently-capitalized rebooking updates the same lead instead of creating a duplicate", async () => {
    dbMock.lead.findFirst.mockResolvedValue({ id: "lead1", name: "Josh Kennedy", stage: "closed_lost" });
    dbMock.lead.update.mockResolvedValue({ id: "lead1", name: "Josh Kennedy" });
    const raw = invitePayload("invitee.created", { email: "Josh.Kennedy@Example.com" });

    await processCalendlyWebhook(raw, sign(raw));

    expect(dbMock.lead.findFirst).toHaveBeenCalledWith({ where: { email: "josh.kennedy@example.com" } });
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });

  it("400s when the invitee payload has no email", async () => {
    const raw = invitePayload("invitee.created", { email: null });
    const result = await processCalendlyWebhook(raw, sign(raw));
    expect(result.status).toBe(400);
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });

  it("is idempotent: a retry for the same invitee URI updates the existing SalesCall, not a new one", async () => {
    dbMock.lead.findFirst.mockResolvedValue({ id: "lead1", name: "Josh Kennedy", stage: "booked" });
    dbMock.lead.update.mockResolvedValue({ id: "lead1", name: "Josh Kennedy" });
    dbMock.salesCall.findUnique.mockResolvedValue({ id: "call1", calendlyInviteeUri: "https://api.calendly.com/scheduled_events/abc/invitees/inv1" });
    const raw = invitePayload("invitee.created");

    await processCalendlyWebhook(raw, sign(raw));

    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "call1" } }));
  });

  it("treats a reschedule (old_invitee matches an existing call) as updating that row, not creating a second", async () => {
    dbMock.lead.findFirst.mockResolvedValue({ id: "lead1", name: "Josh Kennedy", stage: "booked" });
    dbMock.lead.update.mockResolvedValue({ id: "lead1", name: "Josh Kennedy" });
    dbMock.salesCall.findUnique.mockImplementation(async ({ where }: { where: { calendlyInviteeUri: string } }) =>
      where.calendlyInviteeUri === "https://api.calendly.com/scheduled_events/abc/invitees/OLD"
        ? { id: "call-old", calendlyInviteeUri: "https://api.calendly.com/scheduled_events/abc/invitees/OLD" }
        : null
    );
    const raw = invitePayload("invitee.created", {
      uri: "https://api.calendly.com/scheduled_events/abc/invitees/NEW",
      old_invitee: "https://api.calendly.com/scheduled_events/abc/invitees/OLD",
    });

    const result = await processCalendlyWebhook(raw, sign(raw));

    expect(result.body).toMatchObject({ ok: true, leadId: "lead1" });
    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "call-old" },
        data: expect.objectContaining({ calendlyInviteeUri: "https://api.calendly.com/scheduled_events/abc/invitees/NEW" }),
      })
    );
  });
});

describe("processCalendlyWebhook — invitee.canceled", () => {
  it("marks the matching SalesCall cancelled", async () => {
    dbMock.salesCall.updateMany.mockResolvedValue({ count: 1 });
    const raw = invitePayload("invitee.canceled");

    const result = await processCalendlyWebhook(raw, sign(raw));

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true, cancelled: true });
    expect(dbMock.salesCall.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { callStatus: "cancelled" } })
    );
  });

  it("clears nextCallAt on the lead by email even when no matching call is found", async () => {
    dbMock.salesCall.updateMany.mockResolvedValue({ count: 0 });
    const raw = invitePayload("invitee.canceled");

    const result = await processCalendlyWebhook(raw, sign(raw));

    expect(result.body).toMatchObject({ ok: true, cancelled: false });
    expect(dbMock.lead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "josh@example.com", nextCallAt: { not: null } }, data: { nextCallAt: null } })
    );
  });

  it("lowercases the invitee email before the nextCallAt lookup", async () => {
    dbMock.salesCall.updateMany.mockResolvedValue({ count: 0 });
    const raw = invitePayload("invitee.canceled", { email: "Josh@Example.COM" });

    await processCalendlyWebhook(raw, sign(raw));

    expect(dbMock.lead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "josh@example.com", nextCallAt: { not: null } } })
    );
  });
});
