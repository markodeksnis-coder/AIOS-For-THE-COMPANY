// Real actions an Agent chat can take, scoped to its own department only —
// an agent for Sales can never read or write Marketing's data. Every write
// tool stamps `department` server-side (never trusts a value the model
// might pass), and every update tool re-checks the target record's
// department before touching it.

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseYamlBody } from "@/lib/brain";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, PROJECT_STATUSES } from "@/lib/work";
import type { DeptKpi } from "@/lib/scorecards";

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_open_issues",
    description:
      "List open issues (not done/canceled) in your own department. Use this to find an issue's id before updating its status.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_projects",
    description: "List every project in your own department with its id and status.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_scorecard_summary",
    description:
      "Get your department's KPI definitions and the most recently logged real value for each — the actual current numbers, not training material.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_issue",
    description: "Create a new issue in your own department.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short issue title." },
        description: { type: "string", description: "Optional longer description." },
        priority: {
          type: "string",
          enum: [...ISSUE_PRIORITIES],
          description: "Defaults to 'none' if omitted.",
        },
        dueDate: { type: "string", description: "Optional ISO date, YYYY-MM-DD." },
        assignee: { type: "string", description: "Optional person name." },
        projectId: { type: "string", description: "Optional id of an existing project to attach to." },
      },
      required: ["title"],
    },
  },
  {
    name: "update_issue_status",
    description: "Move an issue to a new status. The issue must belong to your own department.",
    input_schema: {
      type: "object",
      properties: {
        issueId: { type: "string" },
        status: { type: "string", enum: [...ISSUE_STATUSES] },
      },
      required: ["issueId", "status"],
    },
  },
  {
    name: "create_project",
    description: "Create a new project in your own department.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        targetDate: { type: "string", description: "Optional ISO date, YYYY-MM-DD." },
        tags: { type: "array", items: { type: "string" }, description: "Optional freeform labels." },
      },
      required: ["name"],
    },
  },
  {
    name: "update_project_status",
    description: "Move a project to a new status. The project must belong to your own department.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        status: { type: "string", enum: [...PROJECT_STATUSES] },
      },
      required: ["projectId", "status"],
    },
  },
  {
    name: "log_scorecard_entry",
    description:
      "Log a real number against one of your department's KPIs. Call get_scorecard_summary first to see valid KPI names.",
    input_schema: {
      type: "object",
      properties: {
        kpiName: { type: "string" },
        period: { type: "string", description: "ISO date, YYYY-MM-DD, this number is logged for." },
        value: { type: "number" },
        note: { type: "string" },
      },
      required: ["kpiName", "period", "value"],
    },
  },
  {
    name: "search_docs",
    description:
      "Search your department's reference docs by keyword — matches title, excerpt, and full body text. The reference material index below only has titles and short excerpts; use this to find which doc(s) actually cover what you need, then call get_doc to read one in full before grounding an answer in it.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Keyword or phrase to search for." } },
      required: ["query"],
    },
  },
  {
    name: "get_doc",
    description: "Get the full body text of one reference doc by its slug (from search_docs or the reference material index).",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
  },
  {
    name: "save_coaching_note",
    description:
      "Save a correction or standing preference so you keep applying it in every future conversation, not just this one. Use this whenever the founder corrects you, tells you to do something differently going forward, or gives you an explicit rule to remember — e.g. \"always mention the free trial extension in no-show follow-ups\" or \"don't suggest a payment plan for leads under $2k deal value.\" Write it as a durable instruction to your future self, not a summary of the conversation.",
    input_schema: {
      type: "object",
      properties: {
        note: { type: "string", description: "The correction or preference, written as a standing instruction." },
      },
      required: ["note"],
    },
  },
];

type ToolOutcome = { output: unknown; summary: string | null; isError: boolean };

function str(input: Record<string, unknown>, key: string): string | null {
  const v = input[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** Best-effort cache revalidation — a mutation already succeeded in the
 *  database by the time this runs, so a revalidation failure (e.g. this
 *  call context doesn't support it) must never turn a successful write
 *  into a reported failure. */
function safeRevalidate(...paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // ignore
    }
  }
}

export async function executeAgentTool(
  name: string,
  input: Record<string, unknown>,
  department: string
): Promise<ToolOutcome> {
  try {
    switch (name) {
      case "list_open_issues": {
        const issues = await db.issue.findMany({
          where: { department, status: { notIn: ["done", "canceled"] } },
          orderBy: { order: "asc" },
          take: 20,
          select: { id: true, title: true, status: true, priority: true, dueDate: true },
        });
        return { output: issues, summary: null, isError: false };
      }
      case "list_projects": {
        const projects = await db.project.findMany({
          where: { department },
          orderBy: { order: "asc" },
          take: 20,
          select: { id: true, name: true, status: true, targetDate: true },
        });
        return { output: projects, summary: null, isError: false };
      }
      case "get_scorecard_summary": {
        const deptFile = await db.brainFile.findFirst({ where: { type: "department", department } });
        const kpis = deptFile
          ? (((parseYamlBody(deptFile) ?? {}) as { kpis?: DeptKpi[] }).kpis ?? [])
          : [];
        const entries = await db.scorecardEntry.findMany({ where: { department } });
        const summary = kpis.map((kpi) => {
          const latest = entries
            .filter((e) => e.kpiName === kpi.name)
            .sort((a, b) => b.period.localeCompare(a.period))[0];
          return {
            name: kpi.name,
            target: kpi.target,
            latestValue: latest?.value ?? null,
            latestPeriod: latest?.period ?? null,
          };
        });
        return { output: summary, summary: null, isError: false };
      }
      case "create_issue": {
        const title = str(input, "title");
        if (!title) return { output: { error: "title is required" }, summary: null, isError: true };
        const priorityRaw = str(input, "priority");
        const priority =
          priorityRaw && (ISSUE_PRIORITIES as readonly string[]).includes(priorityRaw) ? priorityRaw : "none";
        const projectId = str(input, "projectId");
        if (projectId) {
          const project = await db.project.findUnique({ where: { id: projectId }, select: { department: true } });
          if (!project || project.department !== department) {
            return { output: { error: "that project isn't in your department" }, summary: null, isError: true };
          }
        }
        const issue = await db.issue.create({
          data: {
            title,
            description: str(input, "description"),
            priority,
            department,
            dueDate: str(input, "dueDate"),
            assignee: str(input, "assignee"),
            projectId,
          },
        });
        safeRevalidate("/issues", "/inbox", "/");
        return {
          output: { id: issue.id, title: issue.title },
          summary: `Created issue "${issue.title}"`,
          isError: false,
        };
      }
      case "update_issue_status": {
        const issueId = str(input, "issueId");
        const status = str(input, "status");
        if (!issueId || !status || !(ISSUE_STATUSES as readonly string[]).includes(status)) {
          return { output: { error: "issueId and a valid status are required" }, summary: null, isError: true };
        }
        const existing = await db.issue.findUnique({ where: { id: issueId } });
        if (!existing) return { output: { error: "issue not found" }, summary: null, isError: true };
        if (existing.department !== department) {
          return { output: { error: "that issue isn't in your department" }, summary: null, isError: true };
        }
        await db.issue.update({ where: { id: issueId }, data: { status } });
        safeRevalidate("/issues", `/issues/${issueId}`, "/inbox", "/");
        return {
          output: { id: issueId, status },
          summary: `Moved "${existing.title}" to ${status}`,
          isError: false,
        };
      }
      case "create_project": {
        const projectName = str(input, "name");
        if (!projectName) return { output: { error: "name is required" }, summary: null, isError: true };
        const tags = Array.isArray(input.tags)
          ? JSON.stringify(input.tags.filter((t): t is string => typeof t === "string"))
          : "[]";
        const project = await db.project.create({
          data: {
            name: projectName,
            description: str(input, "description"),
            department,
            targetDate: str(input, "targetDate"),
            tags,
          },
        });
        safeRevalidate("/projects", "/");
        return {
          output: { id: project.id, name: project.name },
          summary: `Created project "${project.name}"`,
          isError: false,
        };
      }
      case "update_project_status": {
        const projectId = str(input, "projectId");
        const status = str(input, "status");
        if (!projectId || !status || !(PROJECT_STATUSES as readonly string[]).includes(status)) {
          return { output: { error: "projectId and a valid status are required" }, summary: null, isError: true };
        }
        const existing = await db.project.findUnique({ where: { id: projectId } });
        if (!existing) return { output: { error: "project not found" }, summary: null, isError: true };
        if (existing.department !== department) {
          return { output: { error: "that project isn't in your department" }, summary: null, isError: true };
        }
        await db.project.update({ where: { id: projectId }, data: { status } });
        safeRevalidate("/projects", `/projects/${projectId}`, "/");
        return {
          output: { id: projectId, status },
          summary: `Moved "${existing.name}" to ${status}`,
          isError: false,
        };
      }
      case "log_scorecard_entry": {
        const kpiName = str(input, "kpiName");
        const period = str(input, "period");
        const rawValue = input.value;
        const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
        if (!kpiName || !period || Number.isNaN(value)) {
          return {
            output: { error: "kpiName, period, and a numeric value are required" },
            summary: null,
            isError: true,
          };
        }
        await db.scorecardEntry.create({
          data: { department, kpiName, period, value, note: str(input, "note") },
        });
        safeRevalidate("/scorecards", `/departments/${department}`);
        return {
          output: { kpiName, period, value },
          summary: `Logged ${kpiName} = ${value} for ${period}`,
          isError: false,
        };
      }
      case "search_docs": {
        const query = str(input, "query");
        if (!query) return { output: { error: "query is required" }, summary: null, isError: true };
        const docs = await db.brainFile.findMany({
          where: {
            type: "doc",
            department,
            OR: [
              { title: { contains: query } },
              { excerpt: { contains: query } },
              { body: { contains: query } },
            ],
          },
          orderBy: { title: "asc" },
          take: 15,
          select: { slug: true, title: true, excerpt: true },
        });
        return { output: docs, summary: null, isError: false };
      }
      case "get_doc": {
        const slug = str(input, "slug");
        if (!slug) return { output: { error: "slug is required" }, summary: null, isError: true };
        const doc = await db.brainFile.findUnique({ where: { slug } });
        if (!doc || doc.type !== "doc" || doc.department !== department) {
          return { output: { error: "doc not found in your department" }, summary: null, isError: true };
        }
        return { output: { title: doc.title, body: doc.body }, summary: null, isError: false };
      }
      case "save_coaching_note": {
        const note = str(input, "note");
        if (!note) return { output: { error: "note is required" }, summary: null, isError: true };
        await db.coachingNote.create({ data: { department, content: note } });
        return {
          output: { saved: true },
          summary: `Saved a coaching note: "${note}"`,
          isError: false,
        };
      }
      default:
        return { output: { error: `unknown tool: ${name}` }, summary: null, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { output: { error: message }, summary: null, isError: true };
  }
}
