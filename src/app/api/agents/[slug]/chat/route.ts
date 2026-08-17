import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { DEPARTMENT_LABELS } from "@/lib/brain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5";

type ChatMessage = { role: "user" | "assistant"; content: string };

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

  // Ground the agent in every doc-type brain file filed under its own
  // department — for Sales Coach that's the Sales Fundamentals curriculum.
  // New content added to /brain shows up on the next message automatically.
  const referenceDocs = agent.department
    ? await db.brainFile.findMany({
        where: { type: "doc", department: agent.department },
        orderBy: { title: "asc" },
        select: { title: true, body: true },
      })
    : [];

  const referenceMaterial = referenceDocs.length
    ? referenceDocs.map((d) => `## ${d.title}\n\n${d.body}`).join("\n\n---\n\n")
    : "(No reference docs are filed for this department yet.)";

  const deptLabel = agent.department ? DEPARTMENT_LABELS[agent.department] ?? agent.department : "the company";

  const systemPrompt = [
    `You are ${agent.title}, a coaching assistant for the ${deptLabel} team.`,
    "",
    'Answer questions, role-play scenarios, and quiz the user using the reference material below — it is the company\'s actual training content. If something is not covered in it, say so plainly rather than inventing company-specific policy; general principles are fine to draw on, but distinguish "this is in our training" from "this is general practice."',
    "",
    "Keep responses focused and conversational — this is a chat, not an essay.",
    "",
    "# Reference material",
    "",
    referenceMaterial,
  ].join("\n");

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort: "medium" },
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ reply: "I can't help with that one — try rephrasing?" });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    return NextResponse.json({ reply: textBlock?.text ?? "" });
  } catch (err) {
    console.error("Agent chat error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 502 });
  }
}
