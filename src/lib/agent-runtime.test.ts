import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BrainFile } from "@prisma/client";

// buildAgentSystemPrompt only touches the DB (docs, coaching notes, the
// department file for KPIs) — no Anthropic client involved, so this can be
// tested directly without mocking the SDK. Same db-mocking approach as the
// other *.test.ts files in this directory.
const dbMock = vi.hoisted(() => ({
  brainFile: { findMany: vi.fn(), findFirst: vi.fn() },
  coachingNote: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ db: dbMock }));

const { buildAgentSystemPrompt } = await import("@/lib/agent-runtime");

function agent(overrides: Partial<BrainFile> = {}): BrainFile {
  return {
    id: "a1",
    slug: "head-of-sales",
    title: "Head of Sales",
    type: "agent",
    department: "sales",
    status: "active",
    tags: "[]",
    links: "[]",
    body: "",
    excerpt: null,
    updated: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as BrainFile;
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.brainFile.findMany.mockResolvedValue([]);
  dbMock.brainFile.findFirst.mockResolvedValue(null);
  dbMock.coachingNote.findMany.mockResolvedValue([]);
});

describe("buildAgentSystemPrompt — no department", () => {
  it("says there are no real tools and skips the sales-specific sections", async () => {
    const prompt = await buildAgentSystemPrompt(agent({ department: null, title: "Some Agent" }));
    expect(prompt).toContain("You do not have any real tools available right now.");
    expect(prompt).not.toContain("Inside Sales CRM");
    expect(prompt).not.toContain("Follow-up SOP sequences");
    expect(dbMock.brainFile.findMany).not.toHaveBeenCalled();
    expect(dbMock.coachingNote.findMany).not.toHaveBeenCalled();
  });
});

describe("buildAgentSystemPrompt — non-sales department", () => {
  it("describes real tools scoped to the department but omits the CRM/sequence sections", async () => {
    const prompt = await buildAgentSystemPrompt(agent({ department: "product", title: "Head of Product" }));
    expect(prompt).toContain("You have real tools scoped to the Product department only");
    expect(prompt).not.toContain("Inside Sales CRM");
    expect(prompt).not.toContain("Follow-up SOP sequences");
  });

  it("says no reference docs are filed when there are none", async () => {
    const prompt = await buildAgentSystemPrompt(agent({ department: "product" }));
    expect(prompt).toContain("(No reference docs are filed for this department yet.)");
  });

  it("lists real reference docs by title, slug, and excerpt", async () => {
    dbMock.brainFile.findMany.mockResolvedValue([
      { slug: "objection-handling", title: "Objection Handling", excerpt: "How to handle common objections." },
    ]);
    const prompt = await buildAgentSystemPrompt(agent({ department: "product" }));
    expect(prompt).toContain("**Objection Handling** (`objection-handling`): How to handle common objections.");
  });

  it("says no KPIs are defined when the department has none logged", async () => {
    const prompt = await buildAgentSystemPrompt(agent({ department: "product" }));
    expect(prompt).toContain("(No KPIs defined for this department yet.)");
  });

  it("lists real KPIs parsed from the department's YAML body", async () => {
    dbMock.brainFile.findFirst.mockResolvedValue({
      type: "department",
      body: 'kpis:\n  - name: "SOPs documented"\n    target: "100%"\n',
    });
    const prompt = await buildAgentSystemPrompt(agent({ department: "product" }));
    expect(prompt).toContain("- SOPs documented (target: 100%)");
  });

  it("omits the coaching-notes section when there are none", async () => {
    const prompt = await buildAgentSystemPrompt(agent({ department: "product" }));
    expect(prompt).not.toContain("Coaching notes from the founder");
  });

  it("includes every real coaching note when present", async () => {
    dbMock.coachingNote.findMany.mockResolvedValue([{ content: "Always mention the trial extension." }]);
    const prompt = await buildAgentSystemPrompt(agent({ department: "product" }));
    expect(prompt).toContain("Coaching notes from the founder");
    expect(prompt).toContain("Always mention the trial extension.");
  });
});

describe("buildAgentSystemPrompt — sales department", () => {
  it("includes the CRM tools description and the follow-up sequence index", async () => {
    const prompt = await buildAgentSystemPrompt(agent({ department: "sales", title: "Head of Sales" }));
    expect(prompt).toContain("Inside Sales CRM");
    expect(prompt).toContain("Follow-up SOP sequences");
  });
});

describe("buildAgentSystemPrompt — general", () => {
  it("names the agent and its department in the opening line", async () => {
    const prompt = await buildAgentSystemPrompt(agent({ department: "sales", title: "Head of Sales" }));
    expect(prompt).toContain("You are Head of Sales, an assistant for the");
  });

  it("scopes doc/coaching-note/KPI queries to the agent's own department", async () => {
    await buildAgentSystemPrompt(agent({ department: "finance" }));
    expect(dbMock.brainFile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: "doc", department: "finance" } })
    );
    expect(dbMock.coachingNote.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { department: "finance" } }));
  });
});
