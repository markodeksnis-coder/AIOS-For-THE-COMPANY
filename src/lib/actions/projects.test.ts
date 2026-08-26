import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as leads.test.ts/issues.test.ts in this directory.
const dbMock = vi.hoisted(() => ({
  project: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  $transaction: vi.fn(),
}));

const redirectMock = vi.hoisted(() => vi.fn());
const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { createProject, updateProject, setProjectStatus, moveProject, deleteProject } = await import(
  "@/lib/actions/projects"
);

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.project.create.mockResolvedValue({ id: "proj1", name: "Q1 Launch" });
  dbMock.project.update.mockResolvedValue({});
  dbMock.project.delete.mockResolvedValue({});
  dbMock.$transaction.mockImplementation(async (arg: unknown) => Promise.all(arg as Promise<unknown>[]));
});

describe("createProject", () => {
  it("throws when name is missing", async () => {
    await expect(createProject(formData({}))).rejects.toThrow("Name is required");
    expect(dbMock.project.create).not.toHaveBeenCalled();
  });

  it("creates a project defaulting status to 'planning'", async () => {
    await createProject(formData({ name: "Q1 Launch" }));
    expect(dbMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Q1 Launch", status: "planning" }) })
    );
    expect(redirectMock).toHaveBeenCalledWith("/projects/proj1");
  });

  it("parses a comma-separated tags string into a deduplicated, lowercased JSON array", async () => {
    await createProject(formData({ name: "Q1 Launch", tags: "Q1,  client-facing , q1,URGENT" }));
    const data = dbMock.project.create.mock.calls[0][0].data;
    expect(JSON.parse(data.tags)).toEqual(["q1", "client-facing", "urgent"]);
  });

  it("defaults tags to an empty array when not provided", async () => {
    await createProject(formData({ name: "Q1 Launch" }));
    const data = dbMock.project.create.mock.calls[0][0].data;
    expect(data.tags).toBe("[]");
  });
});

describe("updateProject", () => {
  it("throws when name is missing", async () => {
    await expect(updateProject("proj1", formData({}))).rejects.toThrow("Name is required");
  });

  it("updates the project's fields", async () => {
    await updateProject("proj1", formData({ name: "New Name", status: "active" }));
    expect(dbMock.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "proj1" }, data: expect.objectContaining({ name: "New Name", status: "active" }) })
    );
  });
});

describe("setProjectStatus", () => {
  it("throws on an invalid status", async () => {
    await expect(setProjectStatus("proj1", "not_a_real_status")).rejects.toThrow("Invalid status");
    expect(dbMock.project.update).not.toHaveBeenCalled();
  });

  it("sets a valid status", async () => {
    await setProjectStatus("proj1", "done");
    expect(dbMock.project.update).toHaveBeenCalledWith({ where: { id: "proj1" }, data: { status: "done" } });
  });
});

describe("moveProject", () => {
  it("throws on an invalid status", async () => {
    await expect(moveProject("proj1", "nonsense", ["proj1"])).rejects.toThrow("Invalid status");
    expect(dbMock.$transaction).not.toHaveBeenCalled();
  });

  it("updates the moved project's status and every card's order in the destination column", async () => {
    await moveProject("proj1", "active", ["proj2", "proj1", "proj3"]);

    expect(dbMock.project.update).toHaveBeenCalledWith({ where: { id: "proj1" }, data: { status: "active" } });
    expect(dbMock.project.update).toHaveBeenCalledWith({ where: { id: "proj2" }, data: { order: 0 } });
    expect(dbMock.project.update).toHaveBeenCalledWith({ where: { id: "proj1" }, data: { order: 1 } });
    expect(dbMock.project.update).toHaveBeenCalledWith({ where: { id: "proj3" }, data: { order: 2 } });
  });
});

describe("deleteProject", () => {
  it("deletes the project and redirects to the board", async () => {
    await deleteProject("proj1");
    expect(dbMock.project.delete).toHaveBeenCalledWith({ where: { id: "proj1" } });
    expect(redirectMock).toHaveBeenCalledWith("/projects");
  });
});
