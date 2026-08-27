// Manual, WRITE utility (same category as resolve-issue.ts/set-lead-email.ts)
// — logs one date+setter+source's cold-outbound numbers into OutreachLog,
// the table the /dashboard, /dashboard/outbound, and /dashboard/appointments
// pages read from. Fed by the daily Slack check-in: one Routine asks Marko
// for the numbers, a second Routine reads his reply and runs this script to
// log them.
//
// Upserts on OutreachLog's own (date, setter, source) unique constraint, so
// re-running for the same day/setter/source (a correction, a retry) updates
// the existing row instead of creating a duplicate.
//
// Required: DATE (YYYY-MM-DD), SETTER ("Marko" | "DMdroid"), SOURCE
// ("Skool" | "LinkedIn" | "Instagram"). Optional (default 0 if unset):
// DMS_SENT, REPLIES_RECEIVED, POSITIVE_REPLIES, MEMBERS_JOINED,
// APPOINTMENTS_BOOKED, SHOWS, NO_SHOWS, CASH_COLLECTED.

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

const SETTERS = ["Marko", "DMdroid"];
const SOURCES = ["Skool", "LinkedIn", "Instagram"];

const INT_FIELDS: { envVar: string; column: string }[] = [
  { envVar: "DMS_SENT", column: "dmsSent" },
  { envVar: "REPLIES_RECEIVED", column: "repliesReceived" },
  { envVar: "POSITIVE_REPLIES", column: "positiveReplies" },
  { envVar: "MEMBERS_JOINED", column: "membersJoined" },
  { envVar: "APPOINTMENTS_BOOKED", column: "appointmentsBooked" },
  { envVar: "SHOWS", column: "shows" },
  { envVar: "NO_SHOWS", column: "noShows" },
];

function parseIntEnv(envVar: string): number {
  const raw = process.env[envVar]?.trim();
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`${envVar}="${raw}" isn't a number`);
  return Math.round(n);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const date = process.env.DATE?.trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`DATE "${date}" isn't YYYY-MM-DD`);

  const setter = process.env.SETTER?.trim();
  if (!setter) throw new Error("SETTER is not set");
  if (!SETTERS.includes(setter)) throw new Error(`SETTER "${setter}" must be one of ${SETTERS.join(", ")}`);

  const source = process.env.SOURCE?.trim();
  if (!source) throw new Error("SOURCE is not set");
  if (!SOURCES.includes(source)) throw new Error(`SOURCE "${source}" must be one of ${SOURCES.join(", ")}`);

  const cashRaw = process.env.CASH_COLLECTED?.trim();
  const cashCollected = cashRaw ? Number(cashRaw) : 0;
  if (!Number.isFinite(cashCollected)) throw new Error(`CASH_COLLECTED="${cashRaw}" isn't a number`);

  const values: Record<string, number> = { cashCollected };
  for (const { envVar, column } of INT_FIELDS) values[column] = parseIntEnv(envVar);

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const columns = ["dmsSent", "repliesReceived", "positiveReplies", "membersJoined", "appointmentsBooked", "shows", "noShows", "cashCollected"];
  const now = new Date().toISOString();

  await client.execute({
    sql: `INSERT INTO OutreachLog (id, date, setter, source, ${columns.join(", ")}, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ${columns.map(() => "?").join(", ")}, ?, ?)
          ON CONFLICT(date, setter, source) DO UPDATE SET
          ${columns.map((c) => `${c} = excluded.${c}`).join(", ")}, updatedAt = excluded.updatedAt`,
    args: [crypto.randomUUID(), date, setter, source, ...columns.map((c) => values[c]), now, now],
  });

  console.log(`log-outreach: logged ${date} / ${setter} / ${source} ->`, values);
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
