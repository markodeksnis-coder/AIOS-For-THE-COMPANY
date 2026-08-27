// Manual, WRITE utility — fills OutreachLog with a realistic backlog of
// cold-outbound days so /dashboard, /dashboard/outbound, and
// /dashboard/appointments have something to show before the daily Slack
// check-in has built up real history. Same table, same upsert key, and the
// same @libsql/client access pattern as scripts/log-outreach.ts.
//
// Deliberately deterministic (a seeded sine hash, not Math.random) so
// re-running produces the same numbers instead of drifting every time —
// and it upserts on OutreachLog's own (date, setter, source) unique
// constraint, so a second run corrects rather than duplicates.
//
// Optional env:
//   DAYS         how many days back to fill, default 30
//   END_DATE     last day to fill (YYYY-MM-DD), default today
//   MODE         "seed" (default) writes rows; "check" only reports what's
//                already in the table and writes nothing
//
// A seed run finishes by reading the table back and printing the row count
// plus the DB host it connected to — so if the dashboard still looks empty
// afterwards, the printed host tells you whether this wrote to a different
// database than the one Vercel reads.

import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("seed-outreach: uncaught exception —", err);
  process.exit(1);
});

try {
  process.loadEnvFile();
} catch {
  // no .env file — fine, running in CI with real env vars already set.
}

const SETTERS = ["Marko", "DMdroid"] as const;
const SOURCES = ["Skool", "LinkedIn", "Instagram"] as const;

/** Deterministic 0..1 from an integer — same trick the design mock used, so
 *  the seeded shape matches what was reviewed. */
function rnd(i: number): number {
  const x = Math.sin(i * 91.7) * 43758.5453;
  return x - Math.floor(x);
}

type Row = {
  date: string;
  setter: string;
  source: string;
  dmsSent: number;
  messagesSeen: number;
  repliesReceived: number;
  positiveReplies: number;
  membersJoined: number;
  appointmentsBooked: number;
  shows: number;
  noShows: number;
  cashCollected: number;
};

/** One plausible day for one setter on one source. DMdroid is the
 *  automation — high volume, low reply rate; Marko is hand-written — lower
 *  volume, much better conversion. That contrast is the whole point of the
 *  by-setter table, so the seed data has to show it. */
function buildRow(date: string, setter: string, source: string, k: number): Row {
  const bot = setter === "DMdroid";
  const sourceWeight = source === "Skool" ? 1.15 : source === "LinkedIn" ? 0.95 : 0.8;

  const dmsSent = Math.round((bot ? 90 : 42) * sourceWeight + rnd(k) * (bot ? 70 : 34));
  const seenRate = bot ? 0.42 + rnd(k + 11) * 0.18 : 0.63 + rnd(k + 12) * 0.2;
  const messagesSeen = Math.round(dmsSent * seenRate);
  const replyRate = bot ? 0.055 + rnd(k + 1) * 0.03 : 0.14 + rnd(k + 2) * 0.07;
  const repliesReceived = Math.round(dmsSent * replyRate);
  const positiveReplies = Math.round(repliesReceived * (0.3 + rnd(k + 3) * 0.2));
  const membersJoined = Math.round(positiveReplies * (0.3 + rnd(k + 4) * 0.25));
  const appointmentsBooked = Math.round(positiveReplies * (0.18 + rnd(k + 5) * 0.16));
  const shows = Math.round(appointmentsBooked * (0.55 + rnd(k + 6) * 0.35));
  const noShows = Math.max(0, appointmentsBooked - shows);
  const won = rnd(k + 7) > 0.72;

  return {
    date,
    setter,
    source,
    dmsSent,
    messagesSeen,
    repliesReceived,
    positiveReplies,
    membersJoined,
    appointmentsBooked,
    shows,
    noShows,
    cashCollected: won ? Math.round((2000 + rnd(k + 8) * 5000) / 100) * 100 : 0,
  };
}

const COLUMNS = [
  "dmsSent",
  "messagesSeen",
  "repliesReceived",
  "positiveReplies",
  "membersJoined",
  "appointmentsBooked",
  "shows",
  "noShows",
  "cashCollected",
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const mode = (process.env.MODE?.trim() || "seed").toLowerCase();
  if (mode !== "seed" && mode !== "check") throw new Error(`MODE "${mode}" must be "seed" or "check"`);

  const endDate = process.env.END_DATE?.trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error(`END_DATE "${endDate}" isn't YYYY-MM-DD`);
  const days = Number(process.env.DAYS?.trim() || "30");
  if (!Number.isFinite(days) || days < 1 || days > 365) throw new Error(`DAYS "${days}" must be 1-365`);

  // Host only — never the token — so the log is safe to screenshot while
  // still answering "which database did this actually write to".
  let host = "unknown";
  try {
    host = new URL(url).host;
  } catch {
    /* non-URL DATABASE_URL (e.g. a file path) — leave as unknown */
  }
  console.log(`seed-outreach: mode=${mode} db=${host}`);

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const before = await client.execute("SELECT COUNT(*) AS n FROM OutreachLog");
  console.log(`seed-outreach: OutreachLog rows before = ${before.rows[0]?.n}`);

  if (mode === "check") {
    const recent = await client.execute(
      "SELECT date, setter, source, dmsSent, membersJoined FROM OutreachLog ORDER BY date DESC LIMIT 5"
    );
    console.log("seed-outreach: 5 most recent rows:", JSON.stringify(recent.rows, null, 2));
    client.close();
    return;
  }

  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  const rows: Row[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(end - d * 86_400_000).toISOString().slice(0, 10);
    SETTERS.forEach((setter, si) => {
      SOURCES.forEach((source, xi) => {
        rows.push(buildRow(date, setter, source, d * 7 + si * 3 + xi));
      });
    });
  }

  const sql = `INSERT INTO OutreachLog (id, date, setter, source, ${COLUMNS.join(", ")}, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, ${COLUMNS.map(() => "?").join(", ")}, ?, ?)
               ON CONFLICT(date, setter, source) DO UPDATE SET
               ${COLUMNS.map((c) => `${c} = excluded.${c}`).join(", ")}, updatedAt = excluded.updatedAt`;

  const now = new Date().toISOString();
  await client.batch(
    rows.map((r) => ({
      sql,
      args: [crypto.randomUUID(), r.date, r.setter, r.source, ...COLUMNS.map((c) => r[c]), now, now],
    })),
    "write"
  );

  const after = await client.execute("SELECT COUNT(*) AS n FROM OutreachLog");
  const totals = await client.execute(
    `SELECT SUM(dmsSent) AS dms, SUM(membersJoined) AS members, SUM(appointmentsBooked) AS booked
     FROM OutreachLog`
  );

  console.log(`seed-outreach: wrote ${rows.length} rows (${days} days × ${SETTERS.length} setters × ${SOURCES.length} sources)`);
  console.log(`seed-outreach: OutreachLog rows after = ${after.rows[0]?.n}`);
  console.log("seed-outreach: totals across table:", JSON.stringify(totals.rows[0]));
  console.log(`seed-outreach: if /dashboard still shows 0 after this, the site reads a DIFFERENT database than ${host}`);
  client.close();
}

main()
  .then(() => {
    console.log("seed-outreach: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("seed-outreach: failed —", err);
    process.exit(1);
  });
