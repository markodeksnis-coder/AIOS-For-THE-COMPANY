// Rebuilds the search index from /brain. Safe to run any time — this is
// the only thing allowed to write to the BrainFile table, and it always
// starts by deleting everything and re-reading the files from disk.
// /brain is the source of truth; this index is just a fast mirror of it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, basename, dirname } from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

// Unlike @prisma/client's own auto-loading, this only kicks in when nothing
// has set DATABASE_URL yet (e.g. local dev) — Vercel already injects it.
try {
  process.loadEnvFile();
} catch {
  // no .env file — fine, env vars are already set some other way.
}

const BRAIN_DIR = join(process.cwd(), "brain");
// Same reasoning as src/lib/db.ts: a plain PrismaClient() validates the
// schema's file:-only datasource url even though we never use it directly,
// and DATABASE_URL is a libsql:// URL now — so this needs the adapter too.
const adapter = new PrismaLibSQL({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (extname(entry.name) === ".md" || extname(entry.name) === ".yaml") {
      files.push(full);
    }
  }
  return files;
}

function slugFor(relPath: string): string {
  const parts = relPath.split("/");
  const base = basename(parts[parts.length - 1]).replace(/\.(md|yaml)$/, "").toLowerCase();
  if (base === "department") {
    return `${parts[parts.length - 2]}-department`;
  }
  if (base === "course") {
    return parts[parts.length - 2];
  }
  if (base === "readme") {
    return "brain-readme";
  }
  return base;
}

function wikilinksIn(text: string): string[] {
  const matches = text.matchAll(/\[\[([^\]]+)\]\]/g);
  return [...matches].map((m) => m[1].trim());
}

function excerptOf(body: string): string {
  const clean = body
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return clean.slice(0, 220);
}

type BrainFileRecord = {
  path: string;
  slug: string;
  title: string;
  type: string;
  department: string | null;
  owner: string | null;
  status: string;
  updated: string;
  tags: string;
  links: string;
  body: string;
  excerpt: string;
};

async function main() {
  const files = walk(BRAIN_DIR);
  console.log(`Found ${files.length} files in /brain`);

  const bySlug = new Map<string, string>(); // slug -> path, to catch collisions
  const records: BrainFileRecord[] = [];

  for (const absPath of files) {
    const relPath = relative(BRAIN_DIR, absPath).split("\\").join("/");
    const raw = readFileSync(absPath, "utf-8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;

    if (!fm.title || !fm.type) {
      console.warn(`Skipping ${relPath} — missing required frontmatter (title/type)`);
      continue;
    }

    const slug = slugFor(relPath);
    if (bySlug.has(slug)) {
      throw new Error(
        `Slug collision: "${slug}" used by both ${bySlug.get(slug)} and ${relPath}. ` +
          `Wikilinks assume slugs are unique — rename one of these files.`
      );
    }
    bySlug.set(slug, relPath);

    const frontmatterLinks = (Array.isArray(fm.links) ? fm.links : [])
      .map((l) => String(l).replace(/^\[\[|\]\]$/g, "").trim());
    const inlineLinks = wikilinksIn(parsed.content);
    const allLinks = [...new Set([...frontmatterLinks, ...inlineLinks])];

    const tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [];

    records.push({
      path: relPath,
      slug,
      title: String(fm.title),
      type: String(fm.type),
      department: fm.department ? String(fm.department) : null,
      owner: fm.owner ? String(fm.owner) : null,
      status: fm.status ? String(fm.status) : "draft",
      updated: fm.updated ? String(fm.updated) : "",
      tags: JSON.stringify(tags),
      links: JSON.stringify(allLinks),
      body: parsed.content.trim(),
      excerpt: excerptOf(parsed.content),
    });
  }

  // The workflow that runs this triggers on both `push` and `pull_request`
  // for the same commit, so two runs can execute at nearly the same time
  // against the same shared Turso database. A separate deleteMany() +
  // loop-of-creates left a window where one run's delete could land between
  // another run's delete and its creates, producing duplicate-slug
  // collisions (SQLITE_CONSTRAINT) instead of a clean outcome. Doing the
  // wipe-and-repopulate as a single transaction closes that window — a
  // concurrent second run is serialized behind it by the database instead
  // of interleaving.
  await prisma.$transaction([prisma.brainFile.deleteMany(), prisma.brainFile.createMany({ data: records })]);

  console.log(`Synced ${bySlug.size} files into the index.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
