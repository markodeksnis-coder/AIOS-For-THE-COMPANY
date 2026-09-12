// Seeds 5 fake service-delivery clients so /delivery has something to click
// around in — the Today queue, the Clients grid, the Journey timeline, one
// client left unassigned for the Assign-system wizard. Never imported by
// application code; only ever run by hand. Every seeded client's business
// name ends in "(demo)" so a re-run can tell what it already created and
// skip re-seeding.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const DAY = 86_400_000;
function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEMO_CLIENTS = [
  {
    name: "Rasmus Dahl", business: "Nordic Strength · gym owner (demo)", startDate: daysAgo(9),
    system: "Cold DMs", platform: "Instagram", delivered: 4,
    done: { 0: "all", 1: "all", 3: "all", 7: "all" }, homeworkDone: { 1: "all", 3: "all", 7: "all" },
  },
  {
    name: "Nadia Berg", business: "Berg Consulting · B2B consultant (demo)", startDate: daysAgo(5),
    system: "Cold Email", platform: null, delivered: 3,
    done: { 0: "all", 1: "all", 3: "all" }, homeworkDone: { 1: "all", 3: "partial" },
  },
  {
    name: "Tobias Riis", business: "Riis Media · agency owner (demo)", startDate: daysAgo(2),
    system: "Divine Supercharge", platform: null, delivered: 2,
    done: { 0: "all", 1: "all" }, homeworkDone: { 1: "partial" },
  },
  {
    name: "Emilie Holst", business: "Holst Advisory · B2B coach (demo)", startDate: daysAgo(24),
    system: "Cold DMs", platform: "LinkedIn", delivered: 6,
    done: { 0: "all", 1: "all", 3: "all", 7: "all", 14: "all", 21: "all" }, homeworkDone: { 1: "all", 3: "all", 7: "all", 14: "all" },
  },
  {
    name: "Jonas Vestergaard", business: "Vestergaard PT · personal trainer (demo)", startDate: today(),
    system: null, platform: null, delivered: 0,
    done: {}, homeworkDone: {},
  },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const adapter = new PrismaLibSQL({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  const db = new PrismaClient({ adapter });

  let created = 0;
  let skipped = 0;

  for (const c of DEMO_CLIENTS) {
    const existing = await db.deliveryClient.findFirst({ where: { business: c.business } });
    if (existing) {
      skipped++;
      continue;
    }
    await db.deliveryClient.create({
      data: {
        name: c.name,
        business: c.business,
        startDate: c.startDate,
        system: c.system,
        platform: c.platform,
        delivered: c.delivered,
        done: JSON.stringify(c.done),
        homeworkDone: JSON.stringify(c.homeworkDone),
      },
    });
    created++;
  }

  console.log(`Seed complete: ${created} created, ${skipped} already existed (skipped).`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
