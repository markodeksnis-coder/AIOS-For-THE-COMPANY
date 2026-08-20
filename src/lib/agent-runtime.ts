// Shared between the interactive chat route and the autonomous daily-run
// route — building the same system prompt and running the same tool loop
// either way, so an agent behaves identically whether a person is typing
// to it or it's checking in on its own.

import Anthropic from "@anthropic-ai/sdk";
import type { BrainFile } from "@prisma/client";
import { db } from "@/lib/db";
import { DEPARTMENT_LABELS, parseYamlBody } from "@/lib/brain";
import { AGENT_TOOLS, executeAgentTool } from "@/lib/agent-tools";
import { SALES_TOOLS, executeSalesTool } from "@/lib/sales-tools";
import type { DeptKpi } from "@/lib/scorecards";

const MODEL = "claude-opus-5";
const MAX_TOOL_ROUNDS = 6;

export type ActionTaken = { tool: string; summary: string };

const SALES_TOOL_NAMES = new Set(SALES_TOOLS.map((t) => t.name));

export async function buildAgentSystemPrompt(agent: BrainFile): Promise<string> {
  const department = agent.department;

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
        department === "sales"
          ? "You also have the Inside Sales CRM: list and inspect leads, log a call disposition (which moves the lead's stage automatically — no_show, booked_2nd_call, pif, plan, no_money, not_a_fit, or canceled), confirm a booked call, move a lead's stage directly, and save a personalized no-show or closed-lost follow-up draft. Drafts are never sent automatically — the founder reviews and sends them. For a no-show, draft an email AND a text. For a closed-lost lead, draft a Loom script AND a text."
          : "",
        "",
        "Your department's KPIs:",
        kpiBlock,
        "",
        "After using a tool, always tell the user plainly what you did (or that it failed and why) — never act silently.",
      ]
        .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
        .join("\n")
    : "You do not have any real tools available right now.";

  return [
    `You are ${agent.title}, an assistant for the ${deptLabel} team.`,
    "",
    "You are an agent, not a help menu. Default to action: if a request could reasonably be fulfilled by calling a tool, call it immediately — don't describe what you could do, don't ask permission first, don't list your capabilities. Only ask a clarifying question when you genuinely lack information that would change what you'd do (e.g. which issue, what priority).",
    "",
    "For an open-ended opener like \"what can you help with\" or \"get me started\" — don't reply with a menu of capabilities. Use your tools right away to pull the real current state (open issues, active projects, latest scorecard numbers), lead with what you actually found, and flag anything that looks off. Show, don't describe.",
    "",
    'Ground answers in the reference material below — it is the company\'s actual documentation. If something is not covered in it, say so plainly rather than inventing company-specific policy; general principles are fine to draw on, but distinguish "this is documented" from "this is general practice."',
    "",
    "Keep responses tight — lead with the outcome or the finding, skip the preamble and the bullet-point capability lists.",
    "",
    toolsSection,
    "",
    "# Reference material",
    "",
    referenceMaterial,
  ].join("\n");
}

/** Runs the full tool-use loop for one conversation and returns the final text reply plus every action taken along the way. */
export async function runAgentConversation(
  agent: BrainFile,
  systemPrompt: string,
  conversation: Anthropic.MessageParam[]
): Promise<{ reply: string; actions: ActionTaken[] }> {
  const client = new Anthropic();
  const department = agent.department;
  const tools = department ? [...AGENT_TOOLS, ...(department === "sales" ? SALES_TOOLS : [])] : undefined;
  const execute = (name: string, input: Record<string, unknown>) =>
    SALES_TOOL_NAMES.has(name) ? executeSalesTool(name, input) : executeAgentTool(name, input, department ?? "");
  const actionsTaken: ActionTaken[] = [];

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
      return { reply: "I can't help with that one — try rephrasing?", actions: actionsTaken };
    }

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((b) => b.type === "text");
      return { reply: textBlock?.text ?? "", actions: actionsTaken };
    }

    conversation.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const { output, summary, isError } = await execute(block.name, (block.input ?? {}) as Record<string, unknown>);
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

  return {
    reply: "I took a few actions but hit my step limit before wrapping up — here's what I did so far.",
    actions: actionsTaken,
  };
}
