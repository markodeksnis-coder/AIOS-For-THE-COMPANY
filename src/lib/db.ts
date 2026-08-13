import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// The database lives on Turso (hosted libSQL) — a plain local SQLite file
// doesn't survive Vercel's read-only, per-invocation filesystem, so
// anything created live (issues, projects) would just vanish.
const adapter = new PrismaLibSQL({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Standard Next.js dev-mode singleton so hot reload doesn't open a new
// connection on every file save.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
