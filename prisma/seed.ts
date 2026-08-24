// Seeds 10 fake leads so the CRM has something to click around in while
// testing — dashboard tiles, the kanban board, the leads table, filters.
// Never imported by application code; only ever run by hand. Every seeded
// lead's email ends in @demo.aios-seed so a re-run can tell what it already
// created and skip re-seeding.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const STAGE_DEFAULT_PROBABILITY: Record<string, number> = {
  new_lead: 10,
  booked_unconfirmed: 20,
  confirmed: 35,
  showed: 55,
  no_show: 15,
  closed_won: 100,
  closed_lost: 0,
};

const DEMO_LEADS = [
  { name: "Jordan Blake", email: "jordan.blake@demo.aios-seed", phone: "+1 512 555 0101", company: "Blake Fitness Co", source: "facebook ads", stage: "new_lead" },
  { name: "Priya Nair", email: "priya.nair@demo.aios-seed", phone: "+1 512 555 0102", company: "Nair Coaching", source: "referral", stage: "booked_unconfirmed" },
  { name: "Marcus Webb", email: "marcus.webb@demo.aios-seed", phone: "+1 512 555 0103", company: "Webb Strength Studio", source: "organic", stage: "confirmed" },
  { name: "Elena Torres", email: "elena.torres@demo.aios-seed", phone: "+1 512 555 0104", company: "Torres Training", source: "cold outreach", stage: "showed", dealValue: 3000 },
  { name: "Devon Clarke", email: "devon.clarke@demo.aios-seed", phone: "+1 512 555 0105", company: "Clarke Gym Group", source: "facebook ads", stage: "no_show" },
  { name: "Sofia Ramirez", email: "sofia.ramirez@demo.aios-seed", phone: "+1 512 555 0106", company: "Ramirez Fit Labs", source: "referral", stage: "closed_won", dealValue: 3000, cashCollected: 3000 },
  { name: "Kai Thompson", email: "kai.thompson@demo.aios-seed", phone: "+1 512 555 0107", company: "Thompson Athletics", source: "organic", stage: "closed_lost", lossReason: "Not the right fit right now" },
  { name: "Amara Osei", email: "amara.osei@demo.aios-seed", phone: "+1 512 555 0108", company: "Osei Wellness", source: "facebook ads", stage: "new_lead" },
  { name: "Liam Fitzgerald", email: "liam.fitzgerald@demo.aios-seed", phone: "+1 512 555 0109", company: "Fitzgerald Fight Club", source: "cold outreach", stage: "confirmed" },
  { name: "Nadia Kowalski", email: "nadia.kowalski@demo.aios-seed", phone: "+1 512 555 0110", company: "Kowalski Performance", source: "referral", stage: "showed", dealValue: 3000 },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const adapter = new PrismaLibSQL({ url });
  const db = new PrismaClient({ adapter });

  let created = 0;
  let skipped = 0;

  for (const lead of DEMO_LEADS) {
    const existing = await db.lead.findFirst({ where: { email: lead.email } });
    if (existing) {
      skipped++;
      continue;
    }
    await db.lead.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        stage: lead.stage,
        stageProbability: STAGE_DEFAULT_PROBABILITY[lead.stage],
        dealValue: lead.dealValue ?? 3000,
        cashCollected: lead.cashCollected ?? 0,
        lossReason: lead.lossReason ?? null,
        notes: "Seeded demo lead — safe to delete.",
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
