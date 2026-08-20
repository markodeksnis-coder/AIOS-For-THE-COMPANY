import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { DEPARTMENT_LABELS, parseYamlBody } from "@/lib/brain";
import { AGENT_TOOLS, executeAgentTool } from "@/lib/agent-tools";
import type { DeptKpi } from "@/lib/scorecards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";
const MAX_TOOL_ROUNDS = 6;

type ChatMessage = { role: "user" | "assistant"; content: string };
type ActionTaken = { tool: string; summary: string };

function isValidMessages(value: unknown): value is ChatMessage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const agent = await db.brainFile.findFirst({ where: { slug, type: "agent", status: "active" } });
  if (!agent) {
    return NextResponse.json({ error: "This agent doesn't exist or isn't active yet." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = (body as { messages?: unknown })?.messages;
  if (!isValidMessages(messages)) {
    return NextResponse.json(
      { error: "Body must be { messages: [{ role: 'user'|'assistant', content: string }, ...] }." },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY isn't configured on the server yet — add it in Vercel's env vars." },
      { status: 503 }
    );
  }

  const department = agent.department;

  // Ground the agent in every doc-type brain file filed under its own
  // department — for Sales Coach that's the Sales Fundamentals curriculum.
  // New content added to /brain shows up on the next message automatically.
  const referenceDocs = department
    ? await db.brainFile.findMany({
        where: { type: "doc", department },
        orderBy: { title: "asc" },
        select: { title: true, body: true },
      })
    : [];

  const referenceMaterial = referenceDocs.length
    ? referenceDocs.map((d) => `## ${d.title}\n\n${d.body}`).join("\n\n---\n\n")
    : "(No reference docs are filed for this department yet.)";

  const deptLabel = department ? DEPARTMENT_LABELS[department] ?? department : "the company";

  let kpiBlock = "(No KPIs defined for this department yet.)";
  if (department) {
    const deptFile = await db.brainFile.findFirst({ where: { type: "department", department } });
    const kpis = deptFile ? (((parseYamlBody(deptFile) ?? {}) as { kpis?: DeptKpi[] }).kpis ?? []) : [];
    if (kpis.length) {
      kpiBlock = kpis.map((k) => `- ${k.name} (target: ${k.target})`).join("\n");
    }
  }

  const toolsSection = department
    ? [
        "# Tools",
        "",
        `You have real tools scoped to the ${deptLabel} department only: you can read and create Issues and Projects, and log Scorecard entries against the KPIs below. Nothing you do can touch another department's data.`,
        "",
        "Your department's KPIs:",
        kpiBlock,
        "",
        "After using a tool, always tell the user plainly what you did (or that it failed and why) — never act silently.",
      ].join("\n")
    : "You do not have any real tools available right now.";

  const systemPrompt = [
    `You are ${agent.title}, an assistant for the ${deptLabel} team.`,
    "",
    'Answer questions, give advice, and take real action using your tools when asked. Ground answers in the reference material below — it is the company\'s actual documentation. If something is not covered in it, say so plainly rather than inventing company-specific policy; general principles are fine to draw on, but distinguish "this is documented" from "this is general practice."',
    "",
    "Keep responses focused and conversational — this is a chat, not an essay.",
    "",
    toolsSection,
    "",
    "# Reference material",
    "",
    referenceMaterial,
  ].join("\n");

  const client = new Anthropic();
  const tools = department ? AGENT_TOOLS : undefined;

  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const actionsTaken: ActionTaken[] = [];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        output_config: { effort: "medium" },
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        ...(tools ? { tools } : {}),
        messages: conversation,
      });

      if (response.stop_reason === "refusal") {
        return NextResponse.json({
          reply: "I can't help with that one — try rephrasing?",
          actions: actionsTaken,
        });
      }

      if (response.stop_reason !== "tool_use") {
        const textBlock = response.content.find((b) => b.type === "text");
        return NextResponse.json({ reply: textBlock?.text ?? "", actions: actionsTaken });
      }

      conversation.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const { output, summary, isError } = await executeAgentTool(
          block.name,
          (block.input ?? {}) as Record<string, unknown>,
          department ?? ""
        );
        if (summary) actionsTaken.push({ tool: block.name, summary });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(output),
          is_error: isError,
        });
      }
      conversation.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      reply: "I took a few actions but hit my step limit before wrapping up — here's what I did so far.",
      actions: actionsTaken,
    });
  } catch (err) {
    console.error("Agent chat error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 502 });
  }
}
