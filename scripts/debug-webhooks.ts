// One-off diagnostic: prints the real production webhook activity so a
// "why isn't Fathom/Calendly showing up" question can be answered from a
// GitHub Actions log instead of guessing. Read-only — never writes.
// Run via the "Debug webhooks" workflow (workflow_dispatch), which has
// DATABASE_URL/TURSO_AUTH_TOKEN as repo secrets the same way build-check does.

import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("debug-webhooks: uncaught exception —", err);
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

  console.log("=== Last 20 WebhookEvent rows (any source) ===");
  const events = await client.execute(
    `SELECT createdAt, source, status, eventType, isTest, message FROM WebhookEvent ORDER BY createdAt DESC LIMIT 20`
  );
  if (events.rows.length === 0) {
    console.log("(none — nothing has ever hit /api/webhooks/fathom or /api/webhooks/calendly)");
  } else {
    for (const r of events.rows) {
      console.log(`${r.createdAt} | ${r.source} | ${r.status} | test=${r.isTest} | ${r.eventType ?? "-"} | ${r.message}`);
    }
  }

  console.log("\n=== Unmatched calls waiting for assignment ===");
  const unmatched = await client.execute(
    `SELECT createdAt, source, attendeeEmail, attendeeName FROM UnmatchedCall ORDER BY createdAt DESC LIMIT 20`
  );
  if (unmatched.rows.length === 0) {
    console.log("(none)");
  } else {
    for (const r of unmatched.rows) {
      console.log(`${r.createdAt} | ${r.source} | ${r.attendeeEmail ?? "-"} | ${r.attendeeName ?? "-"}`);
    }
  }

  console.log("\n=== Leads with an email on file (Fathom/Calendly match against this) ===");
  const leads = await client.execute(`SELECT name, email FROM Lead WHERE email IS NOT NULL ORDER BY createdAt DESC LIMIT 30`);
  console.log(`${leads.rows.length} lead(s) with an email:`);
  for (const r of leads.rows) {
    console.log(`  ${r.name} <${r.email}>`);
  }
  const noEmailCount = await client.execute(`SELECT COUNT(*) as n FROM Lead WHERE email IS NULL`);
  console.log(`${noEmailCount.rows[0].n} lead(s) with NO email on file (can never be matched by Fathom/Calendly).`);

  console.log("\n=== Recent SalesCall rows sourced from Fathom ===");
  const fathomCalls = await client.execute(
    `SELECT scheduledAt, callStatus, result, fathomRecordingId FROM SalesCall WHERE fathomRecordingId IS NOT NULL ORDER BY createdAt DESC LIMIT 10`
  );
  console.log(`${fathomCalls.rows.length} call(s) with a fathomRecordingId set.`);
  for (const r of fathomCalls.rows) {
    console.log(`  ${r.scheduledAt} | ${r.callStatus} | result=${r.result ?? "-"} | recordingId=${r.fathomRecordingId}`);
  }

  console.log("\n=== Call debrief coverage ===");
  const debriefableCount = await client.execute(
    `SELECT COUNT(*) as n FROM SalesCall WHERE callStatus IN ('showed', 'no_show')`
  );
  const debriefedCount = await client.execute(`SELECT COUNT(*) as n FROM CallDebrief`);
  console.log(`${debriefableCount.rows[0].n} debriefable call(s) (showed/no_show), ${debriefedCount.rows[0].n} debrief(s) logged.`);

  console.log("\n=== Open Issues (real production backlog) ===");
  const issues = await client.execute(`
    SELECT title, status, priority, department, assignee, dueDate
    FROM Issue
    WHERE status NOT IN ('done', 'canceled')
    ORDER BY
      CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
      createdAt DESC
    LIMIT 30
  `);
  console.log(`${issues.rows.length} open issue(s) (excluding done/canceled):`);
  for (const r of issues.rows) {
    console.log(
      `  [${r.priority}] ${r.title} | ${r.status} | dept=${r.department ?? "-"} | assignee=${r.assignee ?? "-"} | due=${r.dueDate ?? "-"}`
    );
  }

  console.log("\n=== Follow-up touches (full queue snapshot) ===");
  const touches = await client.execute(`
    SELECT ft.templateName, ft.dueAt, ft.sentAt, ft.repliedAt, ft.watched, ft.viewCount, ft.bookedFromThis,
           l.name as leadName
    FROM FollowUpTouch ft JOIN Lead l ON l.id = ft.leadId
    ORDER BY ft.dueAt ASC
  `);
  console.log(`${touches.rows.length} total follow-up touch(es) ever logged.`);
  for (const r of touches.rows) {
    const status = r.sentAt ? `sent ${r.sentAt}${r.repliedAt ? " (replied)" : ""}` : `queued, due ${r.dueAt}`;
    console.log(`  ${r.leadName} | ${r.templateName} | ${status}`);
  }

  client.close();
}

main()
  .then(() => {
    console.log("\ndebug-webhooks: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("debug-webhooks: failed —", err);
    process.exit(1);
  });
