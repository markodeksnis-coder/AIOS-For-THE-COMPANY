import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as the other *-tools.test.ts / webhook test files.
const dbMock = vi.hoisted(() => ({
  lead: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  salesCall: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  followUpTouch: { findFirst: vi.fn(), create: vi.fn() },
  leadDraft: { create: vi.fn() },
  callDebrief: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

const { executeSalesTool } = await import("@/lib/sales-tools");

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.$transaction.mockImplementation(async (cb: (tx: typeof dbMock) => unknown) => cb(dbMock));
  dbMock.salesCall.findFirst.mockResolvedValue(null);
});

describe("executeSalesTool — list_leads / get_lead", () => {
  it("list_leads applies an optional stage filter", async () => {
    dbMock.lead.findMany.mockResolvedValue([]);
    await executeSalesTool("list_leads", { stage: "booked" });
    expect(dbMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { stage: "booked" } }));
  });

  it("list_leads applies no where clause when nothing is passed", async () => {
    dbMock.lead.findMany.mockResolvedValue([]);
    await executeSalesTool("list_leads", {});
    expect(dbMock.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });

  it("get_lead errors without a leadId", async () => {
    const result = await executeSalesTool("get_lead", {});
    expect(result.isError).toBe(true);
  });

  it("get_lead errors when the lead doesn't exist", async () => {
    dbMock.lead.findUnique.mockResolvedValue(null);
    const result = await executeSalesTool("get_lead", { leadId: "l1" });
    expect(result.isError).toBe(true);
  });
});

describe("executeSalesTool — log_sales_call", () => {
  it("errors on an invalid callStatus", async () => {
    const result = await executeSalesTool("log_sales_call", { leadId: "l1", callStatus: "not-real" });
    expect(result.isError).toBe(true);
  });

  it("errors when the lead doesn't exist", async () => {
    dbMock.lead.findUnique.mockResolvedValue(null);
    const result = await executeSalesTool("log_sales_call", { leadId: "l1", callStatus: "showed" });
    expect(result.isError).toBe(true);
  });

  it("creates a new SalesCall and advances the lead's stage when nothing is pending", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "l1", name: "Josh", stage: "booked" });
    const result = await executeSalesTool("log_sales_call", { leadId: "l1", callStatus: "showed" });

    expect(result.isError).toBe(false);
    expect(dbMock.salesCall.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ leadId: "l1", callStatus: "showed" }) }));
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "l1" }, data: expect.objectContaining({ stage: "showed" }) })
    );
  });

  it("finishes an existing pending call row instead of creating a second one", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "l1", name: "Josh", stage: "booked" });
    dbMock.salesCall.findFirst.mockResolvedValue({ id: "call-pending", recordingLink: null, notes: null });
    await executeSalesTool("log_sales_call", { leadId: "l1", callStatus: "showed" });

    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "call-pending" } }));
  });

  it("increments the lead's cashCollected when cash is logged on a closed_won result", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "l1", name: "Josh", stage: "showed" });
    await executeSalesTool("log_sales_call", { leadId: "l1", callStatus: "showed", result: "closed_won", cashCollected: 2000 });

    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cashCollected: { increment: 2000 }, stage: "closed_won" }) })
    );
  });

  it("errors on an unparseable scheduledAt", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "l1", name: "Josh", stage: "booked" });
    const result = await executeSalesTool("log_sales_call", { leadId: "l1", callStatus: "showed", scheduledAt: "not-a-date" });
    expect(result.isError).toBe(true);
    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
  });
});

describe("executeSalesTool — update_lead_stage", () => {
  it("errors on an invalid stage", async () => {
    const result = await executeSalesTool("update_lead_stage", { leadId: "l1", stage: "not-real" });
    expect(result.isError).toBe(true);
  });

  it("errors when the lead doesn't exist", async () => {
    dbMock.lead.findUnique.mockResolvedValue(null);
    const result = await executeSalesTool("update_lead_stage", { leadId: "l1", stage: "showed" });
    expect(result.isError).toBe(true);
  });

  it("moves the lead to the new stage", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "l1", name: "Josh", stage: "booked" });
    const result = await executeSalesTool("update_lead_stage", { leadId: "l1", stage: "showed" });
    expect(result.isError).toBe(false);
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "l1" }, data: expect.objectContaining({ stage: "showed" }) })
    );
  });
});

describe("executeSalesTool — get_follow_up_sequence", () => {
  it("errors on an unknown sequenceId", async () => {
    const result = await executeSalesTool("get_follow_up_sequence", { sequenceId: "does-not-exist" });
    expect(result.isError).toBe(true);
  });
});

describe("executeSalesTool — save_lead_draft", () => {
  it("errors on missing required fields", async () => {
    const result = await executeSalesTool("save_lead_draft", { leadId: "l1" });
    expect(result.isError).toBe(true);
    expect(dbMock.leadDraft.create).not.toHaveBeenCalled();
  });

  it("errors on an invalid channel", async () => {
    const result = await executeSalesTool("save_lead_draft", {
      leadId: "l1",
      kind: "no_show_followup",
      channel: "carrier_pigeon",
      content: "hi",
    });
    expect(result.isError).toBe(true);
  });

  it("errors when the lead doesn't exist", async () => {
    dbMock.lead.findUnique.mockResolvedValue(null);
    const result = await executeSalesTool("save_lead_draft", {
      leadId: "l1",
      kind: "no_show_followup",
      channel: "email",
      content: "hi",
    });
    expect(result.isError).toBe(true);
  });

  it("creates a new follow-up touch when none is open for this lead+template", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "l1", name: "Josh" });
    dbMock.followUpTouch.findFirst.mockResolvedValue(null);
    dbMock.followUpTouch.create.mockResolvedValue({ id: "touch1" });

    const result = await executeSalesTool("save_lead_draft", {
      leadId: "l1",
      kind: "no_show_followup",
      channel: "email",
      content: "Sorry we missed you",
    });

    expect(result.isError).toBe(false);
    expect(dbMock.followUpTouch.create).toHaveBeenCalledTimes(1);
    expect(dbMock.leadDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ followUpTouchId: "touch1" }) })
    );
  });

  it("reuses an already-open touch for the same lead+template instead of creating a second one", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ id: "l1", name: "Josh" });
    dbMock.followUpTouch.findFirst.mockResolvedValue({ id: "touch-existing" });

    await executeSalesTool("save_lead_draft", {
      leadId: "l1",
      kind: "no_show_followup",
      channel: "sms",
      content: "Sorry we missed you",
    });

    expect(dbMock.followUpTouch.create).not.toHaveBeenCalled();
    expect(dbMock.leadDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ followUpTouchId: "touch-existing" }) })
    );
  });
});

describe("executeSalesTool — get_call_debriefs", () => {
  it("computes averages and counts from the raw debriefs", async () => {
    dbMock.callDebrief.findMany.mockResolvedValue([
      {
        weakestStep: "close",
        rootCause: "script",
        objectionType: "money",
        scriptAdherence: 8,
        commitmentScore: 6,
        salesCall: { lead: { name: "Josh" }, scheduledAt: "2026-06-01", callStatus: "showed", result: "closed_lost" },
      },
      {
        weakestStep: "close",
        rootCause: "skill",
        objectionType: "timing",
        scriptAdherence: 6,
        commitmentScore: 8,
        salesCall: { lead: { name: "Sarah" }, scheduledAt: "2026-06-02", callStatus: "showed", result: "closed_won" },
      },
    ]);

    const result = (await executeSalesTool("get_call_debriefs", {})).output as {
      totalDebriefs: number;
      avgScriptAdherence: number | null;
      weakestStepCounts: { value: string; count: number }[];
    };

    expect(result.totalDebriefs).toBe(2);
    expect(result.avgScriptAdherence).toBe(7);
    expect(result.weakestStepCounts).toEqual([{ value: "close", count: 2 }]);
  });
});

it("returns an error for an unknown tool name", async () => {
  const result = await executeSalesTool("not_a_real_tool", {});
  expect(result.isError).toBe(true);
});
