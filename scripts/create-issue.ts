// Manual, WRITE utility — files one real Issue against the production
// database via workflow_dispatch inputs. Companion to resolve-issue.ts
// (which closes an issue); this is the other direction, for when an
// audit turns up something real that needs a human decision rather than
// a straightforward code fix.
//
// Requires TITLE and DESCRIPTION. PRIORITY/DEPARTMENT/ASSIGNEE/DUE_DATE
// are optional and fall back to the same defaults the Issue model itself
// uses.

import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("create-issue: uncaught exception —", err);
  process.exit(1);
});

try {
  process.loadEnvFile();
} catch {
  // no .env file — fine, running in CI with real env vars already set.
}

const VALID_PRIORITIES = new Set(["none", "low", "medium", "high", "urgent"]);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const title = process.env.TITLE;
  if (!title) throw new Error("TITLE is not set");
  const description = process.env.DESCRIPTION;
  if (!description) throw new Error("DESCRIPTION is not set");

  const priority = process.env.PRIORITY || "none";
  if (!VALID_PRIORITIES.has(priority)) {
    throw new Error(`PRIORITY must be one of ${[...VALID_PRIORITIES].join(", ")} — got "${priority}"`);
  }
  const department = process.env.DEPARTMENT || null;
  const assignee = process.env.ASSIGNEE || null;
  const dueDate = process.env.DUE_DATE || null;

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO Issue (id, title, description, status, priority, department, assignee, dueDate, "order", createdAt, updatedAt)
          VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, 0, ?, ?)`,
    args: [id, title, description, priority, department, assignee, dueDate, now, now],
  });

  console.log(`Created issue "${title}" (${id}), priority=${priority}, department=${department ?? "-"}.`);
  client.close();
}

main()
  .then(() => {
    console.log("create-issue: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("create-issue: failed —", err);
    process.exit(1);
  });
