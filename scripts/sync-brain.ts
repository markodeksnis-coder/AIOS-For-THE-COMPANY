// Rebuilds the search index from /brain. Safe to run any time — this is
// the only thing allowed to write to the BrainFile table, and it always
// starts by deleting everything and re-reading the files from disk.
// /brain is the source of truth; this index is just a fast mirror of it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, basename, dirname } from "node:path";
import matter from "gray-matter";
import { PrismaClient } from "@prisma/client";

const BRAIN_DIR = join(process.cwd(), "brain");
const prisma = new PrismaClient();

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

async function main() {
  const files = walk(BRAIN_DIR);
  console.log(`Found ${files.length} files in /brain`);

  await prisma.brainFile.deleteMany();

  const bySlug = new Map<string, string>(); // slug -> path, to catch collisions

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

    await prisma.brainFile.create({
      data: {
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
      },
    });
  }

  console.log(`Synced ${bySlug.size} files into the index.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
