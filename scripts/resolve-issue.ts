// Manual, WRITE utility (unlike debug-webhooks.ts/backlog-review.ts, which
// are strictly read-only) — marks one real Issue as done and leaves a
// comment explaining why, so a backlog item that's objectively resolved
// (verified against real production data first, via backlog-review.ts)
// can be closed with a visible paper trail instead of silently.
//
// Requires ISSUE_ID (exact id, not title — avoids ambiguous matching) and
// RESOLUTION_COMMENT. Refuses to touch an issue that's already done/canceled.

import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("resolve-issue: uncaught exception —", err);
  process.exit(1);
});

try {
  process.loadEnvFile();
} catch {
  // no .env file — fine, running in CI with real env vars already set.
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const issueId = process.env.ISSUE_ID;
  if (!issueId) throw new Error("ISSUE_ID is not set");
  const comment = process.env.RESOLUTION_COMMENT;
  if (!comment) throw new Error("RESOLUTION_COMMENT is not set");

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const existing = await client.execute({
    sql: `SELECT id, title, status FROM Issue WHERE id = ?`,
    args: [issueId],
  });
  if (existing.rows.length === 0) throw new Error(`No issue with id "${issueId}"`);
  const issue = existing.rows[0];
  if (issue.status === "done" || issue.status === "canceled") {
    console.log(`Issue "${issue.title}" is already ${issue.status} — nothing to do.`);
    client.close();
    return;
  }

  // Prisma writes DateTime columns as ISO 8601 strings, not SQLite's own
  // CURRENT_TIMESTAMP format ("YYYY-MM-DD HH:MM:SS", no "T"/timezone) — a
  // raw-SQL write using CURRENT_TIMESTAMP would store a value the app's
  // own Prisma-driven reads might not parse the same way. Match the real
  // format instead of guessing.
  const now = new Date().toISOString();
  const commentId = crypto.randomUUID();

  await client.execute({
    sql: `UPDATE Issue SET status = 'done', updatedAt = ? WHERE id = ?`,
    args: [now, issueId],
  });
  await client.execute({
    sql: `INSERT INTO IssueComment (id, issueId, author, body, createdAt) VALUES (?, ?, ?, ?, ?)`,
    args: [commentId, issueId, "Claude (autonomous)", comment, now],
  });

  console.log(`Marked "${issue.title}" (${issueId}) done and left a comment.`);
  client.close();
}

main()
  .then(() => {
    console.log("resolve-issue: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("resolve-issue: failed —", err);
    process.exit(1);
  });
