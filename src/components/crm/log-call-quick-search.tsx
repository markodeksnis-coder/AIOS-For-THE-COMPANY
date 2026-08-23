"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui/field";

export function LogCallQuickSearch({ leads }: { leads: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads.slice(0, 8);
    return leads.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 8);
  }, [leads, query]);

  function go(id: string) {
    setOpen(false);
    setQuery("");
    router.push(`/sales/crm/${id}#log-call`);
  }

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Log a call
      </Button>
    );
  }

  return (
    <div className="relative">
      <TextInput
        autoFocus
        placeholder="Which lead?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && matches[0]) go(matches[0].id);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-56"
      />
      {matches.length > 0 && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {matches.map((l) => (
            <button
              key={l.id}
              type="button"
              onMouseDown={() => go(l.id)}
              className="block w-full truncate px-3 py-2 text-left text-[0.83rem] font-semibold hover:bg-surface-hover"
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
      {matches.length === 0 && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-border bg-surface px-3 py-2 text-[0.78rem] text-text-faint shadow-lg">
          No lead matches &ldquo;{query}&rdquo;.
        </div>
      )}
    </div>
  );
}
