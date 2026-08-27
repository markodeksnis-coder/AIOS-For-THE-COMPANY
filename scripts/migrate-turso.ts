// `prisma migrate deploy` can't talk to a libsql:// URL directly (Prisma's
// migration engine only accepts file: URLs for SQLite, even with the
// driver-adapters runtime). This applies the same migration SQL files
// straight through the libSQL client instead, tracking what's been
// applied in its own tiny table so it's safe to run on every build.
//
// Everything here is wrapped defensively (top-level crash handlers, a
// dynamic import instead of a static one) so that if this ever breaks
// again, the build log shows the real error instead of just stopping.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("migrate-turso: uncaught exception —", err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("migrate-turso: unhandled rejection —", err);
  process.exit(1);
});

console.log("migrate-turso: starting");

// Unlike @prisma/client, plain scripts don't auto-load .env.
try {
  process.loadEnvFile();
} catch {
  // no .env file (e.g. env vars already set by the platform) — fine.
}

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

async function main() {
  // Preview and Production deployments share the same Turso database (no
  // separate branch DB) — when a PR's Preview build and the Production
  // build from merging that PR land close together, both used to run this
  // against the DB at nearly the same time. One write wins, the other hits
  // a conflict, and that build fails outright — exactly the "every
  // deployment fails until I manually redeploy" pattern, since the manual
  // redeploy runs in isolation and just finds everything already applied.
  // Only Production needs to actually run this; Vercel sets VERCEL_ENV
  // automatically, so Preview can skip it and read what Production already
  // migrated.
  if (process.env.VERCEL_ENV === "preview") {
    console.log("migrate-turso: skipping on a Vercel Preview build — Preview shares Production's Turso database.");
    process.exit(0);
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  let host = "(unparseable URL)";
  try {
    host = new URL(url).host;
  } catch {
    // leave the placeholder — still useful to know the URL didn't parse
  }
  console.log(`migrate-turso: connecting to ${host}`);

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  console.log("migrate-turso: client created, ensuring _migrations table");
  await client.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`
  );

  const applied = new Set(
    (await client.execute(`SELECT name FROM _migrations`)).rows.map((r) => String(r.name))
  );
  console.log(`migrate-turso: ${applied.size} migration(s) already applied`);

  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let ranAny = false;
  for (const folder of folders) {
    if (applied.has(folder)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, folder, "migration.sql"), "utf-8");
    console.log(`migrate-turso: applying ${folder}`);
    try {
      await client.executeMultiple(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // A previous run can crash after applying the DDL but before the
      // INSERT below records it as applied (e.g. a build got interrupted,
      // or the migration was applied through `prisma migrate deploy`
      // directly instead of through this script). Either way the database
      // already matches this migration, so treat that as done instead of
      // failing every build from here on — "already exists" for a CREATE
      // that already ran, "no such table/index/column" for a DROP that
      // already ran, "duplicate column name" for an ADD COLUMN that
      // already ran.
      if (
        /already exists/i.test(message) ||
        /no such (table|index|column)/i.test(message) ||
        /duplicate column name/i.test(message)
      ) {
        console.warn(
          `migrate-turso: ${folder} already matches the database — an earlier run likely applied this but didn't get to record it. Marking as applied.`
        );
      } else {
        throw err;
      }
    }
    await client.execute({
      sql: `INSERT OR IGNORE INTO _migrations (name) VALUES (?)`,
      args: [folder],
    });
    ranAny = true;
  }

  console.log(ranAny ? "migrate-turso: migrations applied." : "migrate-turso: already up to date.");
  client.close();
}

main()
  .then(() => {
    console.log("migrate-turso: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("migrate-turso: failed —", err);
    process.exit(1);
  });
