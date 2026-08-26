import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as leads.test.ts in this directory.
const dbMock = vi.hoisted(() => ({
  issue: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  issueComment: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const redirectMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { createIssue, updateIssue, setIssueField, moveIssue, deleteIssue, addComment } = await import(
  "@/lib/actions/issues"
);

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.issue.create.mockResolvedValue({ id: "issue1", title: "Fix the thing" });
  dbMock.issue.update.mockResolvedValue({});
  dbMock.issue.delete.mockResolvedValue({});
  dbMock.issueComment.create.mockResolvedValue({});
  // moveIssue passes an array of promises to $transaction, not a callback.
  dbMock.$transaction.mockImplementation(async (arg: unknown) => Promise.all(arg as Promise<unknown>[]));
});

describe("createIssue", () => {
  it("throws when title is missing", async () => {
    await expect(createIssue(formData({}))).rejects.toThrow("Title is required");
    expect(dbMock.issue.create).not.toHaveBeenCalled();
  });

  it("creates an issue defaulting status to 'todo' and priority to 'none'", async () => {
    await createIssue(formData({ title: "Fix the thing" }));
    expect(dbMock.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ title: "Fix the thing", status: "todo", priority: "none" }) })
    );
    expect(redirectMock).toHaveBeenCalledWith("/issues/issue1");
  });

  it("uses the provided status/priority when given", async () => {
    await createIssue(formData({ title: "Fix the thing", status: "in_progress", priority: "high" }));
    expect(dbMock.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "in_progress", priority: "high" }) })
    );
  });
});

describe("updateIssue", () => {
  it("throws when title is missing", async () => {
    await expect(updateIssue("issue1", formData({}))).rejects.toThrow("Title is required");
  });

  it("updates the issue's fields", async () => {
    await updateIssue("issue1", formData({ title: "New title", assignee: "marko" }));
    expect(dbMock.issue.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "issue1" }, data: expect.objectContaining({ title: "New title", assignee: "marko" }) })
    );
  });
});

describe("setIssueField", () => {
  it("throws on an invalid status", async () => {
    await expect(setIssueField("issue1", "status", "not_a_real_status")).rejects.toThrow("Invalid status");
    expect(dbMock.issue.update).not.toHaveBeenCalled();
  });

  it("throws on an invalid priority", async () => {
    await expect(setIssueField("issue1", "priority", "not_a_real_priority")).rejects.toThrow("Invalid priority");
    expect(dbMock.issue.update).not.toHaveBeenCalled();
  });

  it("sets a valid status", async () => {
    await setIssueField("issue1", "status", "done");
    expect(dbMock.issue.update).toHaveBeenCalledWith({ where: { id: "issue1" }, data: { status: "done" } });
  });

  it("sets a valid priority", async () => {
    await setIssueField("issue1", "priority", "urgent");
    expect(dbMock.issue.update).toHaveBeenCalledWith({ where: { id: "issue1" }, data: { priority: "urgent" } });
  });
});

describe("moveIssue", () => {
  it("throws on an invalid status", async () => {
    await expect(moveIssue("issue1", "nonsense", ["issue1"])).rejects.toThrow("Invalid status");
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("updates the moved issue's status and every card's order in the destination column", async () => {
    await moveIssue("issue1", "in_progress", ["issue2", "issue1", "issue3"]);

    expect(dbMock.issue.update).toHaveBeenCalledWith({ where: { id: "issue1" }, data: { status: "in_progress" } });
    expect(dbMock.issue.update).toHaveBeenCalledWith({ where: { id: "issue2" }, data: { order: 0 } });
    expect(dbMock.issue.update).toHaveBeenCalledWith({ where: { id: "issue1" }, data: { order: 1 } });
    expect(dbMock.issue.update).toHaveBeenCalledWith({ where: { id: "issue3" }, data: { order: 2 } });
  });
});

describe("deleteIssue", () => {
  it("deletes the issue and redirects to the board", async () => {
    await deleteIssue("issue1");
    expect(dbMock.issue.delete).toHaveBeenCalledWith({ where: { id: "issue1" } });
    expect(redirectMock).toHaveBeenCalledWith("/issues");
  });
});

describe("addComment", () => {
  it("is a no-op when the body is empty", async () => {
    await addComment("issue1", formData({}));
    expect(dbMock.issueComment.create).not.toHaveBeenCalled();
  });

  it("creates a comment, defaulting the author to 'Marko' when not given", async () => {
    await addComment("issue1", formData({ body: "Looks good to me" }));
    expect(dbMock.issueComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ issueId: "issue1", body: "Looks good to me", author: "Marko" }) })
    );
  });

  it("uses the provided author when given", async () => {
    await addComment("issue1", formData({ body: "Noted", author: "Josh" }));
    expect(dbMock.issueComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ author: "Josh" }) })
    );
  });
});
