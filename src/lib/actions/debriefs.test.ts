import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as the other actions/*.test.ts files in this directory.
const dbMock = vi.hoisted(() => ({
  salesCall: { findUnique: vi.fn() },
  callDebrief: { upsert: vi.fn() },
}));

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { saveDebrief } = await import("@/lib/actions/debriefs");

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.salesCall.findUnique.mockResolvedValue({ leadId: "lead1" });
  dbMock.callDebrief.upsert.mockResolvedValue({});
});

describe("saveDebrief", () => {
  it("throws when the call doesn't exist", async () => {
    dbMock.salesCall.findUnique.mockResolvedValue(null);
    await expect(saveDebrief("missing", formData({}))).rejects.toThrow("Call not found");
    expect(dbMock.callDebrief.upsert).not.toHaveBeenCalled();
  });

  it("upserts keyed on salesCallId, filling in the same row on a second save", async () => {
    await saveDebrief("call1", formData({ endReason: "Ran out of time" }));
    expect(dbMock.callDebrief.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { salesCallId: "call1" },
        create: expect.objectContaining({ salesCallId: "call1", endReason: "Ran out of time" }),
        update: expect.objectContaining({ endReason: "Ran out of time" }),
      })
    );
  });

  it("clamps and rounds a score field to the nearest integer within 1-10", async () => {
    await saveDebrief("call1", formData({ scriptAdherence: "7.6" }));
    expect(dbMock.callDebrief.upsert.mock.calls[0][0].create.scriptAdherence).toBe(8);
  });

  it("rejects a score outside the 1-10 range as null rather than clamping it", async () => {
    await saveDebrief("call1", formData({ scriptAdherence: "15" }));
    expect(dbMock.callDebrief.upsert.mock.calls[0][0].create.scriptAdherence).toBeNull();

    await saveDebrief("call1", formData({ scriptAdherence: "0" }));
    expect(dbMock.callDebrief.upsert.mock.calls[1][0].create.scriptAdherence).toBeNull();
  });

  it("rejects an unrecognized enum value for weakestStep/rootCause as null", async () => {
    await saveDebrief("call1", formData({ weakestStep: "not_a_real_step", rootCause: "not_a_real_cause" }));
    const create = dbMock.callDebrief.upsert.mock.calls[0][0].create;
    expect(create.weakestStep).toBeNull();
    expect(create.rootCause).toBeNull();
  });

  it("accepts a valid weakestStep/rootCause enum value", async () => {
    await saveDebrief("call1", formData({ weakestStep: "discovery", rootCause: "skill" }));
    const create = dbMock.callDebrief.upsert.mock.calls[0][0].create;
    expect(create.weakestStep).toBe("discovery");
    expect(create.rootCause).toBe("skill");
  });

  it("only keeps objectionOther when objectionType is 'other'", async () => {
    await saveDebrief("call1", formData({ objectionType: "money", objectionOther: "Some free text" }));
    expect(dbMock.callDebrief.upsert.mock.calls[0][0].create.objectionOther).toBeNull();

    await saveDebrief("call1", formData({ objectionType: "other", objectionOther: "Some free text" }));
    expect(dbMock.callDebrief.upsert.mock.calls[1][0].create.objectionOther).toBe("Some free text");
  });

  it("revalidates the debriefs list, the debrief's own page, and the lead's page", async () => {
    await saveDebrief("call1", formData({}));
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/debriefs");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/debriefs/call1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/lead1");
  });
});
