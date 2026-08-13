"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TYPE_LABELS } from "@/lib/brain";

type Row = {
  slug: string;
  title: string;
  type: string;
  department: string | null;
  status: string;
  excerpt: string;
};

export function DocsSearch({ files }: { files: Row[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.excerpt.toLowerCase().includes(q) ||
        (f.department ?? "").toLowerCase().includes(q)
    );
  }, [files, query]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-faint">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M11.5 11.5L14.5 14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all docs…"
          className="w-full bg-transparent text-[0.88rem] outline-none placeholder:text-text-faint"
        />
        <span className="font-mono text-[0.68rem] text-text-faint">
          {filtered.length}/{files.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">No matches.</div>
        )}
        {filtered.map((f) => (
          <Link
            key={f.slug}
            href={`/docs/${f.slug}`}
            className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5 text-[0.83rem] transition-colors last:border-b-0 hover:bg-surface-hover"
          >
            <span className="flex-1 truncate font-bold">{f.title}</span>
            <span className="hidden truncate text-text-faint sm:block sm:max-w-[32ch]">
              {f.excerpt}
            </span>
            <Badge>{TYPE_LABELS[f.type] ?? f.type}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
