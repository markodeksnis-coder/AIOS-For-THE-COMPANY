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
          select: { id: true, name: true, status: true },
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
        const issue = await db.issue.create({
          data: {
            title,
            description: str(input, "description"),
            priority,
            department,
            dueDate: str(input, "dueDate"),
            assignee: str(input, "assignee"),
            projectId: str(input, "projectId"),
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
      default:
        return { output: { error: `unknown tool: ${name}` }, summary: null, isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { output: { error: message }, summary: null, isError: true };
  }
}
