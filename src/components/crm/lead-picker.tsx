"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createLeadQuick } from "@/lib/actions/leads";
import { TextInput } from "@/components/ui/field";

export type PickedLead = { id: string; name: string };

/** Search-as-you-type lead picker with an inline "create as new lead"
 *  option — the one place in the app that knows how to pick (or create) a
 *  lead, meant to be reused anywhere a lead needs picking rather than each
 *  spot growing its own dropdown. */
export function LeadPicker({
  leads,
  onSelect,
  placeholder = "Which lead?",
  autoFocus,
  onEscape,
  className,
}: {
  leads: PickedLead[];
  onSelect: (lead: PickedLead) => void;
  placeholder?: string;
  autoFocus?: boolean;
  onEscape?: () => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads.slice(0, 8);
    return leads.filter((l) => l.name.toLowerCase().includes(q)).slice(0, 8);
  }, [leads, query]);

  const exactMatch = matches.some((l) => l.name.toLowerCase() === query.trim().toLowerCase());
  const canCreate = query.trim().length > 0 && !exactMatch;

  async function handleCreate() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const lead = await createLeadQuick(name);
      setQuery("");
      onSelect(lead);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <TextInput
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onEscape?.();
          if (e.key === "Enter") {
            if (matches[0]) {
              onSelect(matches[0]);
              setQuery("");
            } else if (canCreate) {
              handleCreate();
            }
          }
        }}
        onBlur={() => setTimeout(() => onEscape?.(), 150)}
      />
      {(matches.length > 0 || canCreate) && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {matches.map((l) => (
            <button
              key={l.id}
              type="button"
              onMouseDown={() => {
                onSelect(l);
                setQuery("");
              }}
              className="block w-full truncate px-3 py-2 text-left text-[0.83rem] font-semibold hover:bg-surface-hover"
            >
              {l.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onMouseDown={handleCreate}
              disabled={creating}
              className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-left text-[0.83rem] font-semibold text-accent-strong hover:bg-surface-hover disabled:opacity-50"
            >
              <Plus size={13} />
              {creating ? "Creating…" : <>Create &ldquo;{query.trim()}&rdquo; as new lead</>}
            </button>
          )}
        </div>
      )}
      {matches.length === 0 && !canCreate && query.trim() && (
        <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-border bg-surface px-3 py-2 text-[0.78rem] text-text-faint shadow-lg">
          No lead matches &ldquo;{query}&rdquo;.
        </div>
      )}
    </div>
  );
}
