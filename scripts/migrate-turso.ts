// `prisma migrate deploy` can't talk to a libsql:// URL directly (Prisma's
// migration engine only accepts file: URLs for SQLite, even with the
// driver-adapters runtime). This applies the same migration SQL files
// straight through the libSQL client instead, tracking what's been
// applied in its own tiny table so it's safe to run on every build.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { createClient } from "@libsql/client";

// Unlike @prisma/client, plain scripts don't auto-load .env.
try {
  process.loadEnvFile();
} catch {
  // no .env file (e.g. env vars already set by the platform) — fine.
}

const MIGRATIONS_DIR = join(process.cwd(), "prisma", "migrations");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  await client.execute(
    `CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`
  );

  const applied = new Set(
    (await client.execute(`SELECT name FROM _migrations`)).rows.map((r) => String(r.name))
  );

  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  let ranAny = false;
  for (const folder of folders) {
    if (applied.has(folder)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, folder, "migration.sql"), "utf-8");
    console.log(`Applying migration: ${folder}`);
    await client.executeMultiple(sql);
    await client.execute({ sql: `INSERT INTO _migrations (name) VALUES (?)`, args: [folder] });
    ranAny = true;
  }

  console.log(ranAny ? "Migrations applied." : "Database already up to date.");
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
