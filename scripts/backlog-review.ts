// One-off, read-only: prints full title + description for every open
// Issue in the real production database, so a real backlog item can be
// acted on with full context instead of just a title. Never writes.
// Run via a manual workflow_dispatch the same way debug-webhooks.ts is.

import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("backlog-review: uncaught exception —", err);
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

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const issues = await client.execute(`
    SELECT id, title, description, status, priority, department, createdAt
    FROM Issue
    WHERE status NOT IN ('done', 'canceled')
    ORDER BY createdAt ASC
  `);

  console.log(`${issues.rows.length} open issue(s):\n`);
  for (const r of issues.rows) {
    console.log(`--- ${r.title} ---`);
    console.log(`id: ${r.id} | priority: ${r.priority} | status: ${r.status} | dept: ${r.department} | created: ${r.createdAt}`);
    console.log(`description: ${r.description ?? "(none)"}`);
    console.log("");
  }

  client.close();
}

main()
  .then(() => {
    console.log("backlog-review: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("backlog-review: failed —", err);
    process.exit(1);
  });
