import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as the other actions/*.test.ts files in this directory.
const dbMock = vi.hoisted(() => ({
  scorecardEntry: { create: vi.fn(), delete: vi.fn() },
}));

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { addScorecardEntry, deleteScorecardEntry } = await import("@/lib/actions/scorecards");

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.scorecardEntry.create.mockResolvedValue({});
  dbMock.scorecardEntry.delete.mockResolvedValue({});
});

describe("addScorecardEntry", () => {
  it("throws when department is missing", async () => {
    await expect(
      addScorecardEntry(formData({ kpiName: "Show rate", period: "2026-W35", value: "80" }))
    ).rejects.toThrow("Department, KPI, period, and value are all required");
    expect(dbMock.scorecardEntry.create).not.toHaveBeenCalled();
  });

  it("throws when kpiName is missing", async () => {
    await expect(
      addScorecardEntry(formData({ department: "sales", period: "2026-W35", value: "80" }))
    ).rejects.toThrow("Department, KPI, period, and value are all required");
  });

  it("throws when period is missing", async () => {
    await expect(
      addScorecardEntry(formData({ department: "sales", kpiName: "Show rate", value: "80" }))
    ).rejects.toThrow("Department, KPI, period, and value are all required");
  });

  it("throws when value is missing", async () => {
    await expect(
      addScorecardEntry(formData({ department: "sales", kpiName: "Show rate", period: "2026-W35" }))
    ).rejects.toThrow("Department, KPI, period, and value are all required");
  });

  it("throws when value isn't a number", async () => {
    await expect(
      addScorecardEntry(formData({ department: "sales", kpiName: "Show rate", period: "2026-W35", value: "not-a-number" }))
    ).rejects.toThrow("Value must be a number");
    expect(dbMock.scorecardEntry.create).not.toHaveBeenCalled();
  });

  it("creates an entry with the parsed numeric value and an optional note", async () => {
    await addScorecardEntry(
      formData({ department: "sales", kpiName: "Show rate", period: "2026-W35", value: "82.5", note: "Best week yet" })
    );
    expect(dbMock.scorecardEntry.create).toHaveBeenCalledWith({
      data: { department: "sales", kpiName: "Show rate", period: "2026-W35", value: 82.5, note: "Best week yet" },
    });
  });

  it("defaults note to null when not provided", async () => {
    await addScorecardEntry(formData({ department: "sales", kpiName: "Show rate", period: "2026-W35", value: "82.5" }));
    expect(dbMock.scorecardEntry.create.mock.calls[0][0].data.note).toBeNull();
  });

  it("revalidates the scorecards page and the entry's own department page", async () => {
    await addScorecardEntry(formData({ department: "sales", kpiName: "Show rate", period: "2026-W35", value: "82.5" }));
    expect(revalidatePathMock).toHaveBeenCalledWith("/scorecards");
    expect(revalidatePathMock).toHaveBeenCalledWith("/departments/sales");
  });
});

describe("deleteScorecardEntry", () => {
  it("deletes the entry and revalidates both the scorecards page and the department page", async () => {
    await deleteScorecardEntry("entry1", "sales");
    expect(dbMock.scorecardEntry.delete).toHaveBeenCalledWith({ where: { id: "entry1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/scorecards");
    expect(revalidatePathMock).toHaveBeenCalledWith("/departments/sales");
  });
});
