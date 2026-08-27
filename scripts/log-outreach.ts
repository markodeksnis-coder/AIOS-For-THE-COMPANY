// Manual, WRITE utility (same category as resolve-issue.ts/set-lead-email.ts)
// — logs the daily outreach numbers (DMs sent, positive replies, messages
// sent, Skool members joined) that /dashboard shows but nothing in this app
// tracks automatically. Fed by the daily Slack check-in: one Routine asks
// Marko for the numbers, a second Routine reads his reply and runs this
// script to log them.
//
// Upserts (by department="outreach" + kpiName + date) rather than always
// inserting, so re-running for the same day (a correction, a retry) updates
// the existing row instead of creating a duplicate — ScorecardEntry has no
// unique constraint across those three columns, so this does the find-then-
// update/create by hand instead of a real DB-level upsert.
//
// Inputs (all optional — only the ones provided get logged): DATE
// (YYYY-MM-DD, defaults to today), DMS_SENT, POSITIVE_REPLIES,
// MESSAGES_SENT, SKOOL_MEMBERS_JOINED.

import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("log-outreach: uncaught exception —", err);
  process.exit(1);
});

try {
  process.loadEnvFile();
} catch {
  // no .env file — fine, running in CI with real env vars already set.
}

const DEPARTMENT = "outreach";
const METRICS: { envVar: string; kpiName: string }[] = [
  { envVar: "DMS_SENT", kpiName: "DMs sent" },
  { envVar: "POSITIVE_REPLIES", kpiName: "Positive replies" },
  { envVar: "MESSAGES_SENT", kpiName: "Messages sent" },
  { envVar: "SKOOL_MEMBERS_JOINED", kpiName: "Skool members joined" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const date = process.env.DATE?.trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`DATE "${date}" isn't YYYY-MM-DD`);

  const toLog = METRICS.map((m) => ({ ...m, raw: process.env[m.envVar]?.trim() })).filter(
    (m): m is { envVar: string; kpiName: string; raw: string } => Boolean(m.raw)
  );
  if (toLog.length === 0) {
    throw new Error("None of DMS_SENT, POSITIVE_REPLIES, MESSAGES_SENT, SKOOL_MEMBERS_JOINED were set");
  }
  for (const m of toLog) {
    if (!Number.isFinite(Number(m.raw))) throw new Error(`${m.envVar}="${m.raw}" isn't a number`);
  }

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  for (const { kpiName, raw } of toLog) {
    const value = Number(raw);
    const existing = await client.execute({
      sql: `SELECT id FROM ScorecardEntry WHERE department = ? AND kpiName = ? AND period = ?`,
      args: [DEPARTMENT, kpiName, date],
    });
    if (existing.rows.length > 0) {
      await client.execute({
        sql: `UPDATE ScorecardEntry SET value = ? WHERE id = ?`,
        args: [value, existing.rows[0].id as string],
      });
      console.log(`log-outreach: updated "${kpiName}" for ${date} -> ${value}`);
    } else {
      await client.execute({
        sql: `INSERT INTO ScorecardEntry (id, department, kpiName, period, value, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), DEPARTMENT, kpiName, date, value, new Date().toISOString()],
      });
      console.log(`log-outreach: logged "${kpiName}" for ${date} -> ${value}`);
    }
  }

  client.close();
}

main()
  .then(() => {
    console.log("log-outreach: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("log-outreach: failed —", err);
    process.exit(1);
  });
