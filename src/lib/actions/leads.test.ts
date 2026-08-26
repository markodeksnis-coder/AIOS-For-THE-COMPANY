import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as the webhook-handler test files in this
// session — mock @/lib/db so these Server Actions' DB calls hit vi.fn()s
// instead of a real database. $transaction just invokes its callback (or,
// for moveLead's array form, resolves each promise) against the same mock
// object, so calls made through `tx` land on the same spies as `db.*` calls.
const dbMock = vi.hoisted(() => ({
  lead: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
  salesCall: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

const redirectMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const {
  createLead,
  updateLead,
  setLeadStage,
  moveLead,
  createLeadQuick,
  importLeadsCsv,
  deleteLead,
  logSalesCall,
  updateSalesCall,
} = await import("@/lib/actions/leads");

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.lead.create.mockResolvedValue({ id: "lead1", name: "Josh Kennedy" });
  dbMock.lead.update.mockResolvedValue({});
  dbMock.lead.delete.mockResolvedValue({});
  dbMock.lead.findUnique.mockResolvedValue(null);
  dbMock.lead.findMany.mockResolvedValue([]);
  dbMock.lead.createMany.mockResolvedValue({ count: 0 });
  dbMock.salesCall.create.mockResolvedValue({});
  dbMock.salesCall.update.mockResolvedValue({});
  dbMock.salesCall.findUnique.mockResolvedValue(null);
  dbMock.salesCall.findFirst.mockResolvedValue(null);
  // Covers both usages: db.$transaction(cb) (logSalesCall/updateSalesCall)
  // and db.$transaction([promises]) (moveLead) — Promise.all resolves an
  // array of already-settled mock-call promises just fine.
  dbMock.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: typeof dbMock) => unknown)(dbMock) : Promise.all(arg as Promise<unknown>[])
  );
});

describe("createLead", () => {
  it("throws when name is missing", async () => {
    await expect(createLead(formData({}))).rejects.toThrow("Name is required");
    expect(dbMock.lead.create).not.toHaveBeenCalled();
  });

  it("creates a lead defaulting to the 'booked' stage with its default probability", async () => {
    await createLead(formData({ name: "Josh Kennedy" }));
    expect(dbMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Josh Kennedy", stage: "booked", stageProbability: 20 }) })
    );
    expect(redirectMock).toHaveBeenCalledWith("/sales/crm/lead1");
  });
});

describe("updateLead", () => {
  it("throws when name is missing", async () => {
    await expect(updateLead("lead1", formData({}))).rejects.toThrow("Name is required");
  });

  it("updates the lead's fields", async () => {
    await updateLead("lead1", formData({ name: "New Name", email: "a@b.com" }));
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lead1" }, data: expect.objectContaining({ name: "New Name", email: "a@b.com" }) })
    );
  });
});

describe("setLeadStage", () => {
  it("throws on an invalid stage", async () => {
    await expect(setLeadStage("lead1", "not_a_real_stage")).rejects.toThrow("Invalid stage");
    expect(dbMock.lead.update).not.toHaveBeenCalled();
  });

  it("sets stageChangedAt when the stage actually changes", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ stage: "booked" });
    await setLeadStage("lead1", "showed");
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: "showed", stageChangedAt: expect.any(Date) }) })
    );
  });

  it("does not touch stageChangedAt when re-setting the same stage", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ stage: "showed" });
    await setLeadStage("lead1", "showed");
    const data = dbMock.lead.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("stageChangedAt");
  });
});

describe("moveLead", () => {
  it("throws on an invalid stage", async () => {
    await expect(moveLead("lead1", "nonsense", ["lead1"])).rejects.toThrow("Invalid stage");
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("updates the moved lead's stage and every card's order in the destination column", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ stage: "booked" });
    await moveLead("lead1", "showed", ["lead2", "lead1", "lead3"]);

    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "lead1" }, data: expect.objectContaining({ stage: "showed" }) })
    );
    expect(dbMock.lead.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "lead2" }, data: { order: 0 } }));
    expect(dbMock.lead.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "lead1" }, data: { order: 1 } }));
    expect(dbMock.lead.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "lead3" }, data: { order: 2 } }));
  });

  it("does not reset stageChangedAt on a same-column reorder (not a real stage move)", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ stage: "booked" });
    await moveLead("lead1", "booked", ["lead1"]);
    const call = dbMock.lead.update.mock.calls.find((c) => c[0].where.id === "lead1" && "stage" in c[0].data);
    expect(call![0].data).not.toHaveProperty("stageChangedAt");
  });
});

describe("createLeadQuick", () => {
  it("throws on an empty/whitespace-only name", async () => {
    await expect(createLeadQuick("   ")).rejects.toThrow("Name is required");
  });

  it("creates a bare lead at the 'booked' stage", async () => {
    dbMock.lead.create.mockResolvedValue({ id: "lead9", name: "Trimmed Name" });
    const result = await createLeadQuick("  Trimmed Name  ");
    expect(dbMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Trimmed Name", stage: "booked" }) })
    );
    expect(result).toEqual({ id: "lead9", name: "Trimmed Name" });
  });
});

describe("importLeadsCsv", () => {
  it("skips rows with no name", async () => {
    const result = await importLeadsCsv([{ name: "  ", email: null, phone: null, company: null, source: null, notes: null }]);
    expect(result).toEqual({ created: 0, skipped: 1 });
    expect(dbMock.lead.createMany).not.toHaveBeenCalled();
  });

  it("skips a row whose email already exists in the database", async () => {
    dbMock.lead.findMany.mockResolvedValue([{ email: "josh@example.com", phone: null }]);
    const result = await importLeadsCsv([
      { name: "Josh Kennedy", email: "JOSH@example.com", phone: null, company: null, source: null, notes: null },
    ]);
    expect(result).toEqual({ created: 0, skipped: 1 });
  });

  it("skips a row whose phone already exists in the database", async () => {
    dbMock.lead.findMany.mockResolvedValue([{ email: null, phone: "555-1234" }]);
    const result = await importLeadsCsv([
      { name: "Josh Kennedy", email: null, phone: "555-1234", company: null, source: null, notes: null },
    ]);
    expect(result).toEqual({ created: 0, skipped: 1 });
  });

  it("catches a duplicate within the same upload, not just against the database", async () => {
    const result = await importLeadsCsv([
      { name: "Josh Kennedy", email: "josh@example.com", phone: null, company: null, source: null, notes: null },
      { name: "Josh K. (dup)", email: "josh@example.com", phone: null, company: null, source: null, notes: null },
    ]);
    expect(result).toEqual({ created: 1, skipped: 1 });
    expect(dbMock.lead.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [expect.objectContaining({ name: "Josh Kennedy" })] })
    );
  });

  it("bulk-inserts every non-duplicate row in a single createMany call", async () => {
    const rows = [
      { name: "Josh Kennedy", email: "josh@example.com", phone: null, company: null, source: null, notes: null },
      { name: "Marko Deksnis", email: "marko@example.com", phone: null, company: null, source: null, notes: null },
    ];
    const result = await importLeadsCsv(rows);
    expect(result).toEqual({ created: 2, skipped: 0 });
    expect(dbMock.lead.createMany).toHaveBeenCalledTimes(1);
  });

  it("does not call createMany at all when every row is skipped", async () => {
    await importLeadsCsv([{ name: "", email: null, phone: null, company: null, source: null, notes: null }]);
    expect(dbMock.lead.createMany).not.toHaveBeenCalled();
  });
});

describe("deleteLead", () => {
  it("deletes the lead and redirects to the pipeline", async () => {
    await deleteLead("lead1");
    expect(dbMock.lead.delete).toHaveBeenCalledWith({ where: { id: "lead1" } });
    expect(redirectMock).toHaveBeenCalledWith("/sales/crm");
  });
});

describe("logSalesCall", () => {
  it("throws when the call date/time is missing", async () => {
    await expect(logSalesCall("lead1", formData({}))).rejects.toThrow("Call date/time is required");
  });

  it("throws on an unparseable call date/time", async () => {
    await expect(logSalesCall("lead1", formData({ scheduledAt: "not-a-date" }))).rejects.toThrow("Invalid call date/time");
  });

  it("throws on an invalid call status", async () => {
    await expect(
      logSalesCall("lead1", formData({ scheduledAt: "2026-06-15T14:00", callStatus: "not_a_real_status" }))
    ).rejects.toThrow("Invalid call status");
  });

  it("creates a new SalesCall row when there's no pending call to finish", async () => {
    await logSalesCall("lead1", formData({ scheduledAt: "2026-06-15T14:00", callStatus: "showed" }));
    expect(dbMock.salesCall.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ leadId: "lead1", callStatus: "showed" }) })
    );
    expect(dbMock.salesCall.update).not.toHaveBeenCalled();
  });

  it("finishes an existing pending call instead of creating a second row", async () => {
    dbMock.salesCall.findFirst.mockResolvedValue({ id: "call-pending", recordingLink: null, notes: null });
    await logSalesCall("lead1", formData({ scheduledAt: "2026-06-15T14:00", callStatus: "showed" }));
    expect(dbMock.salesCall.create).not.toHaveBeenCalled();
    expect(dbMock.salesCall.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "call-pending" } }));
  });

  it("never looks for a pending call to finish when logging a fresh booked/rescheduled entry", async () => {
    await logSalesCall("lead1", formData({ scheduledAt: "2026-06-20T10:00", callStatus: "booked" }));
    expect(dbMock.salesCall.findFirst).not.toHaveBeenCalled();
    expect(dbMock.salesCall.create).toHaveBeenCalled();
  });

  it("derives the lead's stage from the result when a result is logged, overriding the plain callStatus mapping", async () => {
    dbMock.lead.findUnique.mockResolvedValue({ stage: "booked" });
    await logSalesCall(
      "lead1",
      formData({ scheduledAt: "2026-06-15T14:00", callStatus: "showed", result: "closed_won" })
    );
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stage: "closed_won" }) })
    );
  });

  it("sets nextCallAt for a booked/rescheduled log and clears it for a disposed call", async () => {
    await logSalesCall("lead1", formData({ scheduledAt: "2026-06-20T10:00", callStatus: "rescheduled" }));
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nextCallAt: expect.any(Date) }) })
    );

    dbMock.lead.update.mockClear();
    await logSalesCall("lead1", formData({ scheduledAt: "2026-06-15T14:00", callStatus: "showed" }));
    expect(dbMock.lead.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ nextCallAt: null }) }));
  });

  it("increments the lead's running cashCollected by the amount logged on this call", async () => {
    await logSalesCall(
      "lead1",
      formData({ scheduledAt: "2026-06-15T14:00", callStatus: "showed", result: "closed_won", cashCollected: "1500" })
    );
    expect(dbMock.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cashCollected: { increment: 1500 } }) })
    );
  });
});

describe("updateSalesCall", () => {
  it("throws when the call doesn't exist", async () => {
    await expect(updateSalesCall("missing", formData({}))).rejects.toThrow("Call not found");
  });

  it("throws on an invalid call status", async () => {
    dbMock.salesCall.findUnique.mockResolvedValue({
      id: "call1",
      leadId: "lead1",
      callStatus: "showed",
      cashCollected: 0,
      scheduledAt: "2026-06-15",
      startedAt: new Date("2026-06-15T14:00:00Z"),
    });
    await expect(updateSalesCall("call1", formData({ callStatus: "bogus" }))).rejects.toThrow("Invalid call status");
  });

  // The real bug this session found and fixed: editing a call used to
  // overwrite cashCollected outright instead of applying the delta, so the
  // lead's running total silently drifted from the sum of its calls every
  // time a rep corrected a previously-logged number.
  it("applies the delta between the new and old cashCollected instead of overwriting the lead's running total", async () => {
    dbMock.salesCall.findUnique.mockResolvedValue({
      id: "call1",
      leadId: "lead1",
      callStatus: "showed",
      cashCollected: 1000,
      scheduledAt: "2026-06-15",
      startedAt: new Date("2026-06-15T14:00:00Z"),
    });
    await updateSalesCall("call1", formData({ callStatus: "showed", cashCollected: "1500" }));

    const leadUpdateCall = dbMock.lead.update.mock.calls.find((c) => c[0].where.id === "lead1");
    expect(leadUpdateCall![0].data.cashCollected).toEqual({ increment: 500 });
  });

  it("does not touch cashCollected at all when the amount is unchanged", async () => {
    dbMock.salesCall.findUnique.mockResolvedValue({
      id: "call1",
      leadId: "lead1",
      callStatus: "showed",
      cashCollected: 1000,
      scheduledAt: "2026-06-15",
      startedAt: new Date("2026-06-15T14:00:00Z"),
    });
    await updateSalesCall("call1", formData({ callStatus: "showed", cashCollected: "1000" }));

    // lead.update still runs (stage re-derivation), just without a
    // cashCollected key in its data — a zero delta must never touch it.
    const leadUpdateCall = dbMock.lead.update.mock.calls.find((c) => c[0].where.id === "lead1");
    expect(leadUpdateCall![0].data).not.toHaveProperty("cashCollected");
  });

  it("applies a negative delta when the corrected amount is lower than what was originally logged", async () => {
    dbMock.salesCall.findUnique.mockResolvedValue({
      id: "call1",
      leadId: "lead1",
      callStatus: "showed",
      cashCollected: 2000,
      scheduledAt: "2026-06-15",
      startedAt: new Date("2026-06-15T14:00:00Z"),
    });
    await updateSalesCall("call1", formData({ callStatus: "showed", cashCollected: "500" }));

    const leadUpdateCall = dbMock.lead.update.mock.calls.find((c) => c[0].where.id === "lead1");
    expect(leadUpdateCall![0].data.cashCollected).toEqual({ increment: -1500 });
  });
});
