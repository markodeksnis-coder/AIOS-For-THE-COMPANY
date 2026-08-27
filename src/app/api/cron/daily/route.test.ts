import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks agent-runtime and follow-up-sweep entirely — their own logic is
// covered by agent-runtime.test.ts and follow-up-sweep.test.ts. This file
// only exercises the route's own wiring: the auth gate and, most
// importantly, that every branch calls db.cronRun.upsert so a misconfigured
// cron leaves a trace instead of looking exactly like it never ran.
const dbMock = vi.hoisted(() => ({
  cronRun: { upsert: vi.fn() },
  issue: { findFirst: vi.fn(), create: vi.fn() },
  brainFile: { findMany: vi.fn() },
}));

const buildAgentSystemPromptMock = vi.hoisted(() => vi.fn());
const runAgentConversationMock = vi.hoisted(() => vi.fn());
const runFollowUpSweepMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/agent-runtime", () => ({
  buildAgentSystemPrompt: buildAgentSystemPromptMock,
  runAgentConversation: runAgentConversationMock,
}));
vi.mock("@/lib/follow-up-sweep", () => ({ runFollowUpSweep: runFollowUpSweepMock }));

const { GET } = await import("./route");

function request(headers: Record<string, string> = {}) {
  return { headers: { get: (key: string) => headers[key.toLowerCase()] ?? null } } as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  dbMock.cronRun.upsert.mockResolvedValue({});
  dbMock.issue.findFirst.mockResolvedValue({ id: "existing" }); // skip the Monday-only issue-creation path by default
  dbMock.brainFile.findMany.mockResolvedValue([]);
  runFollowUpSweepMock.mockResolvedValue({ ran: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/cron/daily", () => {
  it("records missing_cron_secret_env and 503s when CRON_SECRET isn't configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(request());
    expect(res.status).toBe(503);
    expect(dbMock.cronRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ ok: false, reason: "missing_cron_secret_env" }) })
    );
  });

  it("records unauthorized and 401s on a missing/wrong auth header", async () => {
    const res = await GET(request({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
    expect(dbMock.cronRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ ok: false, reason: "unauthorized" }) })
    );
  });

  it("records missing_anthropic_api_key and 503s when the key isn't configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(503);
    expect(dbMock.cronRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ ok: false, reason: "missing_anthropic_api_key" }) })
    );
  });

  it("records success once agents run and the sweep completes", async () => {
    const res = await GET(request({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
    expect(dbMock.cronRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ ok: true, reason: "success" }) })
    );
    expect(runFollowUpSweepMock).toHaveBeenCalled();
  });

  it("upserts keyed on today's UTC date, so a retry collapses instead of growing the table", async () => {
    await GET(request({ authorization: "Bearer test-secret" }));
    const call = dbMock.cronRun.upsert.mock.calls[0][0];
    expect(call.where.date).toBe(new Date().toISOString().slice(0, 10));
  });
});
