import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as calendly-webhook.test.ts / fathom-webhook.test.ts.
const dbMock = vi.hoisted(() => ({
  issue: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  project: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  scorecardEntry: { findMany: vi.fn(), create: vi.fn() },
  brainFile: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  coachingNote: { create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));
// executeAgentTool calls revalidatePath after every write — outside a real
// request/render context (which this test file isn't) it throws, and every
// call site wraps it in safeRevalidate's try/catch specifically for that,
// so no need to mock next/cache here.

const { executeAgentTool } = await import("@/lib/agent-tools");

const DEPT = "sales";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("executeAgentTool — read tools", () => {
  it("list_open_issues scopes to the caller's department and excludes done/canceled", async () => {
    dbMock.issue.findMany.mockResolvedValue([{ id: "i1", title: "Fix thing" }]);
    const result = await executeAgentTool("list_open_issues", {}, DEPT);
    expect(result.isError).toBe(false);
    expect(dbMock.issue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { department: DEPT, status: { notIn: ["done", "canceled"] } } })
    );
  });

  it("list_projects scopes to the caller's department", async () => {
    dbMock.project.findMany.mockResolvedValue([]);
    await executeAgentTool("list_projects", {}, DEPT);
    expect(dbMock.project.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { department: DEPT } }));
  });

  it("get_scorecard_summary pairs each KPI with its latest logged value", async () => {
    dbMock.brainFile.findFirst.mockResolvedValue({
      type: "department",
      body: 'kpis:\n  - name: "Close rate"\n    target: "30%"\n',
    });
    dbMock.scorecardEntry.findMany.mockResolvedValue([
      { kpiName: "Close rate", period: "2026-01-01", value: 20 },
      { kpiName: "Close rate", period: "2026-02-01", value: 25 },
    ]);
    const result = await executeAgentTool("get_scorecard_summary", {}, DEPT);
    expect(result.output).toEqual([{ name: "Close rate", target: "30%", latestValue: 25, latestPeriod: "2026-02-01" }]);
  });

  it("get_scorecard_summary returns an empty list when the department has no brain file", async () => {
    dbMock.brainFile.findFirst.mockResolvedValue(null);
    const result = await executeAgentTool("get_scorecard_summary", {}, DEPT);
    expect(result.output).toEqual([]);
  });
});

describe("executeAgentTool — create_issue", () => {
  it("errors without a title", async () => {
    const result = await executeAgentTool("create_issue", {}, DEPT);
    expect(result.isError).toBe(true);
    expect(dbMock.issue.create).not.toHaveBeenCalled();
  });

  it("stamps department server-side regardless of what's passed", async () => {
    dbMock.issue.create.mockResolvedValue({ id: "i1", title: "New issue" });
    await executeAgentTool("create_issue", { title: "New issue" }, DEPT);
    expect(dbMock.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ department: DEPT }) })
    );
  });

  it("falls back priority to 'none' when an invalid value is passed", async () => {
    dbMock.issue.create.mockResolvedValue({ id: "i1", title: "New issue" });
    await executeAgentTool("create_issue", { title: "New issue", priority: "not-a-real-priority" }, DEPT);
    expect(dbMock.issue.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ priority: "none" }) })
    );
  });

  it("rejects a projectId belonging to a different department", async () => {
    dbMock.project.findUnique.mockResolvedValue({ department: "marketing" });
    const result = await executeAgentTool("create_issue", { title: "New issue", projectId: "p1" }, DEPT);
    expect(result.isError).toBe(true);
    expect(dbMock.issue.create).not.toHaveBeenCalled();
  });

  it("rejects a projectId that doesn't exist", async () => {
    dbMock.project.findUnique.mockResolvedValue(null);
    const result = await executeAgentTool("create_issue", { title: "New issue", projectId: "does-not-exist" }, DEPT);
    expect(result.isError).toBe(true);
    expect(dbMock.issue.create).not.toHaveBeenCalled();
  });

  it("accepts a projectId belonging to the same department", async () => {
    dbMock.project.findUnique.mockResolvedValue({ department: DEPT });
    dbMock.issue.create.mockResolvedValue({ id: "i1", title: "New issue" });
    const result = await executeAgentTool("create_issue", { title: "New issue", projectId: "p1" }, DEPT);
    expect(result.isError).toBe(false);
    expect(dbMock.issue.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ projectId: "p1" }) }));
  });
});

describe("executeAgentTool — update_issue_status", () => {
  it("errors on an invalid status", async () => {
    const result = await executeAgentTool("update_issue_status", { issueId: "i1", status: "not-real" }, DEPT);
    expect(result.isError).toBe(true);
  });

  it("errors when the issue doesn't exist", async () => {
    dbMock.issue.findUnique.mockResolvedValue(null);
    const result = await executeAgentTool("update_issue_status", { issueId: "i1", status: "done" }, DEPT);
    expect(result.isError).toBe(true);
    expect(dbMock.issue.update).not.toHaveBeenCalled();
  });

  it("errors when the issue belongs to a different department", async () => {
    dbMock.issue.findUnique.mockResolvedValue({ id: "i1", title: "X", department: "marketing" });
    const result = await executeAgentTool("update_issue_status", { issueId: "i1", status: "done" }, DEPT);
    expect(result.isError).toBe(true);
    expect(dbMock.issue.update).not.toHaveBeenCalled();
  });

  it("updates when the issue is in the caller's own department", async () => {
    dbMock.issue.findUnique.mockResolvedValue({ id: "i1", title: "X", department: DEPT });
    const result = await executeAgentTool("update_issue_status", { issueId: "i1", status: "done" }, DEPT);
    expect(result.isError).toBe(false);
    expect(dbMock.issue.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { status: "done" } });
  });
});

describe("executeAgentTool — create_project / update_project_status", () => {
  it("create_project errors without a name", async () => {
    const result = await executeAgentTool("create_project", {}, DEPT);
    expect(result.isError).toBe(true);
  });

  it("create_project stamps department and serializes tags", async () => {
    dbMock.project.create.mockResolvedValue({ id: "p1", name: "New project" });
    await executeAgentTool("create_project", { name: "New project", tags: ["a", "b", 5] }, DEPT);
    expect(dbMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ department: DEPT, tags: JSON.stringify(["a", "b"]) }) })
    );
  });

  it("update_project_status errors when the project belongs to a different department", async () => {
    dbMock.project.findUnique.mockResolvedValue({ id: "p1", name: "X", department: "marketing" });
    const result = await executeAgentTool("update_project_status", { projectId: "p1", status: "active" }, DEPT);
    expect(result.isError).toBe(true);
    expect(dbMock.project.update).not.toHaveBeenCalled();
  });
});

describe("executeAgentTool — log_scorecard_entry", () => {
  it("errors without a numeric value", async () => {
    const result = await executeAgentTool("log_scorecard_entry", { kpiName: "Close rate", period: "2026-01-01" }, DEPT);
    expect(result.isError).toBe(true);
    expect(dbMock.scorecardEntry.create).not.toHaveBeenCalled();
  });

  it("logs a valid entry", async () => {
    const result = await executeAgentTool(
      "log_scorecard_entry",
      { kpiName: "Close rate", period: "2026-01-01", value: 30 },
      DEPT
    );
    expect(result.isError).toBe(false);
    expect(dbMock.scorecardEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ department: DEPT, kpiName: "Close rate", value: 30 }) })
    );
  });
});

describe("executeAgentTool — docs and coaching notes", () => {
  it("search_docs scopes to the caller's department", async () => {
    dbMock.brainFile.findMany.mockResolvedValue([]);
    await executeAgentTool("search_docs", { query: "objection" }, DEPT);
    expect(dbMock.brainFile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ type: "doc", department: DEPT }) })
    );
  });

  it("get_doc rejects a doc from a different department", async () => {
    dbMock.brainFile.findUnique.mockResolvedValue({ type: "doc", department: "marketing", title: "X", body: "Y" });
    const result = await executeAgentTool("get_doc", { slug: "some-doc" }, DEPT);
    expect(result.isError).toBe(true);
  });

  it("get_doc returns the full body for a doc in the caller's department", async () => {
    dbMock.brainFile.findUnique.mockResolvedValue({ type: "doc", department: DEPT, title: "X", body: "Y" });
    const result = await executeAgentTool("get_doc", { slug: "some-doc" }, DEPT);
    expect(result.output).toEqual({ title: "X", body: "Y" });
  });

  it("save_coaching_note errors without a note", async () => {
    const result = await executeAgentTool("save_coaching_note", {}, DEPT);
    expect(result.isError).toBe(true);
  });

  it("save_coaching_note saves against the caller's department", async () => {
    await executeAgentTool("save_coaching_note", { note: "Always mention the trial extension" }, DEPT);
    expect(dbMock.coachingNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { department: DEPT, content: "Always mention the trial extension" } })
    );
  });
});

it("returns an error for an unknown tool name", async () => {
  const result = await executeAgentTool("not_a_real_tool", {}, DEPT);
  expect(result.isError).toBe(true);
});
