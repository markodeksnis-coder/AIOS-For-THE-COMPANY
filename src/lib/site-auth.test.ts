import { describe, it, expect } from "vitest";
import { hashSitePassword } from "@/lib/site-auth";

describe("hashSitePassword", () => {
  it("is deterministic for the same input", async () => {
    const a = await hashSitePassword("correct-horse");
    const b = await hashSitePassword("correct-horse");
    expect(a).toBe(b);
  });

  it("produces different hashes for different passwords", async () => {
    const a = await hashSitePassword("correct-horse");
    const b = await hashSitePassword("wrong-password");
    expect(a).not.toBe(b);
  });

  it("never returns the plaintext password itself", async () => {
    const hash = await hashSitePassword("correct-horse");
    expect(hash).not.toBe("correct-horse");
    expect(hash).not.toContain("correct-horse");
  });

  it("produces a 64-character lowercase hex string (SHA-256)", async () => {
    const hash = await hashSitePassword("anything");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
