import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  isOverdue,
} from "./work";

describe("status/priority vocabulary consistency", () => {
  it("every IssueStatus has a label", () => {
    for (const status of ISSUE_STATUSES) {
      expect(ISSUE_STATUS_LABELS[status], `label for ${status}`).toBeTypeOf("string");
    }
  });

  it("every IssuePriority has a label", () => {
    for (const priority of ISSUE_PRIORITIES) {
      expect(ISSUE_PRIORITY_LABELS[priority], `label for ${priority}`).toBeTypeOf("string");
    }
  });

  it("every ProjectStatus has a label", () => {
    for (const status of PROJECT_STATUSES) {
      expect(PROJECT_STATUS_LABELS[status], `label for ${status}`).toBeTypeOf("string");
    }
  });
});

describe("isOverdue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is false when there's no due date", () => {
    expect(isOverdue(null, "todo")).toBe(false);
  });

  it("is false for a done issue even with a past due date", () => {
    expect(isOverdue("2020-01-01", "done")).toBe(false);
  });

  it("is false for a canceled issue even with a past due date", () => {
    expect(isOverdue("2020-01-01", "canceled")).toBe(false);
  });

  it("is true when the due date's end of day has passed and the issue is still open", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
    expect(isOverdue("2026-06-14", "todo")).toBe(true);
    expect(isOverdue("2026-06-14", "in_progress")).toBe(true);
    expect(isOverdue("2026-06-14", "backlog")).toBe(true);
  });

  it("is false on the due date itself before 23:59:59 local has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T10:00:00Z"));
    expect(isOverdue("2026-06-14", "todo")).toBe(false);
  });

  it("is false for a future due date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00Z"));
    expect(isOverdue("2026-06-14", "todo")).toBe(false);
  });
});
