// Manual, WRITE utility (same category as resolve-issue.ts/create-issue.ts)
// — backfills a Lead's email when it's missing from the CRM even though the
// person gave it somewhere Claude can't reach directly (e.g. a Calendly
// booking form; api.calendly.com is blocked from this sandbox's outbound
// network, so that data has to come from a human instead of being pulled
// automatically). Exists so that hand-off only has to happen once per lead
// — once the email is on file, Fathom/Calendly matching, the AI follow-up
// sweep, and this script's own future lookups all work off it without
// asking again.
//
// Requires LEAD_NAME (exact, case-insensitive) and EMAIL. Refuses to guess
// across an ambiguous name match — get the exact id from Debug webhooks'
// "Leads with an email on file" section (or Backlog review, for the
// no-email case) and re-run with LEAD_ID instead if LEAD_NAME matches more
// than one row.

import process from "node:process";

process.on("uncaughtException", (err) => {
  console.error("set-lead-email: uncaught exception —", err);
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
  const email = process.env.EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("EMAIL is not set");
  if (!email.includes("@")) throw new Error(`"${email}" doesn't look like an email address`);
  const leadId = process.env.LEAD_ID?.trim() || null;
  const leadName = process.env.LEAD_NAME?.trim() || null;
  if (!leadId && !leadName) throw new Error("Neither LEAD_ID nor LEAD_NAME is set");

  const { createClient } = await import("@libsql/client");
  const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

  const matches = leadId
    ? await client.execute({ sql: `SELECT id, name, email, createdAt FROM Lead WHERE id = ?`, args: [leadId] })
    : await client.execute({
        sql: `SELECT id, name, email, createdAt FROM Lead WHERE LOWER(name) = LOWER(?)`,
        args: [leadName as string],
      });

  if (matches.rows.length === 0) {
    throw new Error(leadId ? `No lead with id "${leadId}"` : `No lead named "${leadName}"`);
  }
  if (matches.rows.length > 1) {
    const list = matches.rows.map((r) => `  id=${r.id} | email=${r.email ?? "(none)"} | created=${r.createdAt}`).join("\n");
    throw new Error(
      `"${leadName}" matches ${matches.rows.length} leads — re-run with LEAD_ID set to the right one instead:\n${list}`
    );
  }

  const lead = matches.rows[0];

  try {
    await client.execute({ sql: `UPDATE Lead SET email = ? WHERE id = ?`, args: [email, lead.id] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/UNIQUE constraint failed/i.test(message)) {
      throw new Error(`"${email}" is already on file for a different lead — check for a duplicate before overwriting.`);
    }
    throw err;
  }

  console.log(
    `Set email for "${lead.name}" (${lead.id}): ${lead.email ?? "(none)"} -> ${email}`
  );
  client.close();
}

main()
  .then(() => {
    console.log("set-lead-email: done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("set-lead-email: failed —", err);
    process.exit(1);
  });
