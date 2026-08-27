import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as the other actions/*.test.ts files in this directory.
const dbMock = vi.hoisted(() => ({
  followUpTouch: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const {
  createFollowUpTouch,
  markFollowUpSent,
  markFollowUpReplied,
  markFollowUpBooked,
  updateFollowUpWatch,
  deleteFollowUpTouch,
} = await import("@/lib/actions/follow-ups");

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.followUpTouch.create.mockResolvedValue({});
  dbMock.followUpTouch.update.mockResolvedValue({});
  dbMock.followUpTouch.delete.mockResolvedValue({});
});

describe("createFollowUpTouch", () => {
  it("throws when leadId is missing", async () => {
    await expect(createFollowUpTouch(formData({ templateName: "SMS", dueAt: "2026-06-15T14:00" }))).rejects.toThrow(
      "Lead is required"
    );
  });

  it("throws when templateName is missing", async () => {
    await expect(createFollowUpTouch(formData({ leadId: "lead1", dueAt: "2026-06-15T14:00" }))).rejects.toThrow(
      "Template/reason name is required"
    );
  });

  it("throws when dueAt is missing", async () => {
    await expect(createFollowUpTouch(formData({ leadId: "lead1", templateName: "SMS" }))).rejects.toThrow(
      "Due date/time is required"
    );
  });

  it("throws on an unparseable dueAt", async () => {
    await expect(
      createFollowUpTouch(formData({ leadId: "lead1", templateName: "SMS", dueAt: "not-a-date" }))
    ).rejects.toThrow("Invalid due date/time");
  });

  it("creates a queued (not-yet-sent) touch with sentAt null when 'already sent' isn't checked", async () => {
    await createFollowUpTouch(formData({ leadId: "lead1", templateName: "SMS", dueAt: "2026-06-15T14:00" }));
    expect(dbMock.followUpTouch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ leadId: "lead1", sentAt: null }) })
    );
  });

  it("sets sentAt when 'already sent' is checked, falling back to dueAt if sentAt isn't given", async () => {
    await createFollowUpTouch(
      formData({ leadId: "lead1", templateName: "SMS", dueAt: "2026-06-15T14:00", alreadySent: "on" })
    );
    const data = dbMock.followUpTouch.create.mock.calls[0][0].data;
    expect(data.sentAt).toEqual(new Date("2026-06-15T14:00"));
  });

  it("uses the explicit sentAt when given alongside 'already sent'", async () => {
    await createFollowUpTouch(
      formData({
        leadId: "lead1",
        templateName: "SMS",
        dueAt: "2026-06-15T14:00",
        alreadySent: "on",
        sentAt: "2026-06-10T09:00",
      })
    );
    const data = dbMock.followUpTouch.create.mock.calls[0][0].data;
    expect(data.sentAt).toEqual(new Date("2026-06-10T09:00"));
  });

  it("throws on an unparseable explicit sentAt", async () => {
    await expect(
      createFollowUpTouch(
        formData({
          leadId: "lead1",
          templateName: "SMS",
          dueAt: "2026-06-15T14:00",
          alreadySent: "on",
          sentAt: "not-a-date",
        })
      )
    ).rejects.toThrow("Invalid sent date/time");
  });

  it("revalidates the follow-ups queue", async () => {
    await createFollowUpTouch(formData({ leadId: "lead1", templateName: "SMS", dueAt: "2026-06-15T14:00" }));
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/follow-ups");
  });
});

describe("one-click mark actions", () => {
  it("markFollowUpSent sets sentAt to now", async () => {
    await markFollowUpSent("touch1");
    expect(dbMock.followUpTouch.update).toHaveBeenCalledWith({ where: { id: "touch1" }, data: { sentAt: expect.any(Date) } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/follow-ups");
  });

  it("markFollowUpReplied sets repliedAt to now", async () => {
    await markFollowUpReplied("touch1");
    expect(dbMock.followUpTouch.update).toHaveBeenCalledWith({
      where: { id: "touch1" },
      data: { repliedAt: expect.any(Date) },
    });
  });

  it("markFollowUpBooked sets bookedFromThis to true", async () => {
    await markFollowUpBooked("touch1");
    expect(dbMock.followUpTouch.update).toHaveBeenCalledWith({ where: { id: "touch1" }, data: { bookedFromThis: true } });
  });
});

describe("updateFollowUpWatch", () => {
  it("sets watched true/false based on the checkbox and parses viewCount", async () => {
    await updateFollowUpWatch("touch1", formData({ watched: "on", viewCount: "3" }));
    expect(dbMock.followUpTouch.update).toHaveBeenCalledWith({
      where: { id: "touch1" },
      data: { watched: true, viewCount: 3 },
    });
  });

  it("defaults watched to false and viewCount to null when not provided", async () => {
    await updateFollowUpWatch("touch1", formData({}));
    expect(dbMock.followUpTouch.update).toHaveBeenCalledWith({
      where: { id: "touch1" },
      data: { watched: false, viewCount: null },
    });
  });
});

describe("deleteFollowUpTouch", () => {
  it("deletes the touch and revalidates the queue", async () => {
    await deleteFollowUpTouch("touch1");
    expect(dbMock.followUpTouch.delete).toHaveBeenCalledWith({ where: { id: "touch1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/follow-ups");
  });
});
