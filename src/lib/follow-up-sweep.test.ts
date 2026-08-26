import { describe, it, expect, vi, beforeEach } from "vitest";

// Same db-mocking approach as the other *.test.ts files in this directory.
// agent-runtime and next/cache are mocked too since runFollowUpSweep calls
// straight through to both (a real Claude call and a real revalidatePath
// would either fail or be meaningless in a unit test).
const dbMock = vi.hoisted(() => ({
  lead: { findMany: vi.fn() },
  brainFile: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  agentActivity: { create: vi.fn() },
}));

const agentRuntimeMock = vi.hoisted(() => ({
  buildAgentSystemPrompt: vi.fn(),
  runAgentConversation: vi.fn(),
}));

const revalidatePathMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/agent-runtime", () => agentRuntimeMock);
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

const { runFollowUpSweep } = await import("@/lib/follow-up-sweep");

const AGENT = { id: "a1", slug: "head-of-sales", title: "Head of Sales", department: "sales" };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  dbMock.lead.findMany.mockResolvedValue([]);
  dbMock.brainFile.findFirst.mockResolvedValue(AGENT);
  dbMock.brainFile.findUniqueOrThrow.mockResolvedValue(AGENT);
  agentRuntimeMock.buildAgentSystemPrompt.mockResolvedValue("system prompt");
  agentRuntimeMock.runAgentConversation.mockResolvedValue({
    reply: "done",
    actions: [{ tool: "save_lead_draft", summary: "drafted" }],
  });
  dbMock.agentActivity.create.mockResolvedValue({});
});

describe("runFollowUpSweep — nothing to do", () => {
  it("returns ran:false without touching the API key or agent when there are no gap leads", async () => {
    delete process.env.ANTHROPIC_API_KEY; // proves the empty-gap check runs first
    const result = await runFollowUpSweep();
    expect(result).toEqual({
      ran: false,
      reason: "Nothing to sweep — every closed-lost and no-show lead already has a drafted follow-up.",
    });
    expect(dbMock.brainFile.findFirst).not.toHaveBeenCalled();
  });
});

describe("runFollowUpSweep — preconditions", () => {
  it("returns ran:false when ANTHROPIC_API_KEY isn't configured, even with gap leads", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    dbMock.lead.findMany.mockResolvedValueOnce([{ id: "l1", name: "Josh" }]).mockResolvedValueOnce([]);
    const result = await runFollowUpSweep();
    expect(result).toEqual({ ran: false, reason: "ANTHROPIC_API_KEY isn't configured on the server yet." });
  });

  it("returns ran:false when the sales agent isn't set up", async () => {
    dbMock.lead.findMany.mockResolvedValueOnce([{ id: "l1", name: "Josh" }]).mockResolvedValueOnce([]);
    dbMock.brainFile.findFirst.mockResolvedValue(null);
    const result = await runFollowUpSweep();
    expect(result).toEqual({ ran: false, reason: "The sales agent isn't set up yet." });
  });
});

describe("runFollowUpSweep — happy path", () => {
  it("sweeps closed-lost and no-show leads, tags each with its own draft kind", async () => {
    dbMock.lead.findMany
      .mockResolvedValueOnce([{ id: "cl1", name: "Closed Lost Lead" }])
      .mockResolvedValueOnce([{ id: "ns1", name: "No Show Lead" }]);

    const result = await runFollowUpSweep();

    expect(result.ran).toBe(true);
    if (!result.ran) throw new Error("unreachable");
    expect(result.swept).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.totalDraftsCreated).toBe(2); // one save_lead_draft action per lead
    const byId = Object.fromEntries(result.results.map((r) => [r.leadId, r]));
    expect(byId["cl1"].kind).toBe("closed_lost_followup");
    expect(byId["ns1"].kind).toBe("no_show_followup");
  });

  it("caps the swept leads at 5 even when more gap leads exist across both kinds", async () => {
    const closedLost = Array.from({ length: 5 }, (_, i) => ({ id: `cl${i}`, name: `CL ${i}` }));
    const noShow = Array.from({ length: 5 }, (_, i) => ({ id: `ns${i}`, name: `NS ${i}` }));
    dbMock.lead.findMany.mockResolvedValueOnce(closedLost).mockResolvedValueOnce(noShow);

    const result = await runFollowUpSweep();

    expect(result.ran).toBe(true);
    if (!result.ran) throw new Error("unreachable");
    expect(result.swept).toBe(5);
    expect(result.results).toHaveLength(5);
  });

  it("records one agentActivity entry summarizing the whole sweep", async () => {
    dbMock.lead.findMany.mockResolvedValueOnce([{ id: "cl1", name: "Closed Lost Lead" }]).mockResolvedValueOnce([]);
    await runFollowUpSweep();
    expect(dbMock.agentActivity.create).toHaveBeenCalledTimes(1);
    const data = dbMock.agentActivity.create.mock.calls[0][0].data;
    expect(data.kind).toBe("follow_up_sweep");
    expect(data.agentSlug).toBe("head-of-sales");
    expect(data.summary).toContain("Swept 1 lead(s)");
  });

  it("revalidates the follow-ups queue and each swept lead's own CRM page", async () => {
    dbMock.lead.findMany.mockResolvedValueOnce([{ id: "cl1", name: "Closed Lost Lead" }]).mockResolvedValueOnce([]);
    await runFollowUpSweep();
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/follow-ups");
    expect(revalidatePathMock).toHaveBeenCalledWith("/sales/crm/cl1");
  });

  it("never lets a revalidatePath failure turn a successful sweep into a reported failure", async () => {
    dbMock.lead.findMany.mockResolvedValueOnce([{ id: "cl1", name: "Closed Lost Lead" }]).mockResolvedValueOnce([]);
    revalidatePathMock.mockImplementation(() => {
      throw new Error("no cache scope in this context");
    });
    const result = await runFollowUpSweep();
    expect(result.ran).toBe(true);
  });
});

describe("runFollowUpSweep — per-lead failure isolation", () => {
  it("reports one lead's failure without aborting the rest of the sweep", async () => {
    dbMock.lead.findMany
      .mockResolvedValueOnce([{ id: "cl1", name: "Will Fail" }])
      .mockResolvedValueOnce([{ id: "ns1", name: "Will Succeed" }]);
    // findGapLeads shuffles the two kinds together, so which lead is
    // dispatched first/second is non-deterministic — key off the lead id
    // embedded in the conversation content rather than call order.
    agentRuntimeMock.runAgentConversation.mockImplementation(
      async (_agent: unknown, _systemPrompt: string, conversation: { content: string }[]) => {
        if (conversation[0].content.includes("Lead id: cl1")) {
          throw new Error("Claude API timed out");
        }
        return { reply: "done", actions: [{ tool: "save_lead_draft", summary: "drafted" }] };
      }
    );

    const result = await runFollowUpSweep();

    expect(result.ran).toBe(true);
    if (!result.ran) throw new Error("unreachable");
    expect(result.failed).toBe(1);
    expect(result.swept).toBe(2);
    const byId = Object.fromEntries(result.results.map((r) => [r.leadId, r]));
    expect(byId["cl1"]).toMatchObject({ ok: false, error: "Claude API timed out" });
    expect(byId["ns1"]).toMatchObject({ ok: true, draftsCreated: 1 });
  });
});
