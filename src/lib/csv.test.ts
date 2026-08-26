import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses a simple comma-separated file", () => {
    expect(parseCsv("name,email\nJosh,josh@example.com")).toEqual([
      ["name", "email"],
      ["Josh", "josh@example.com"],
    ]);
  });

  it("handles a quoted field containing a comma", () => {
    expect(parseCsv('name,company\nJosh,"Acme, Inc."')).toEqual([
      ["name", "company"],
      ["Josh", "Acme, Inc."],
    ]);
  });

  it("handles an escaped double-quote inside a quoted field", () => {
    expect(parseCsv('name,note\nJosh,"He said ""hi"" to me"')).toEqual([
      ["name", "note"],
      ["Josh", 'He said "hi" to me'],
    ]);
  });

  it("handles a newline inside a quoted field", () => {
    expect(parseCsv('name,note\nJosh,"line one\nline two"')).toEqual([
      ["name", "note"],
      ["Josh", "line one\nline two"],
    ]);
  });

  it("treats \\r\\n and bare \\r the same as \\n", () => {
    const crlf = parseCsv("a,b\r\nc,d");
    const cr = parseCsv("a,b\rc,d");
    const lf = parseCsv("a,b\nc,d");
    expect(crlf).toEqual(lf);
    expect(cr).toEqual(lf);
  });

  it("parses the last row even without a trailing newline", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("still captures the last row when the file does end with a trailing newline", () => {
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("drops fully blank rows (e.g. a trailing blank line)", () => {
    expect(parseCsv("a,b\nc,d\n\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("preserves empty fields within an otherwise non-blank row", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });
});
