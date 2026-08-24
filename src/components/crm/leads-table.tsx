"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_STAGE_STYLE } from "@/lib/crm";
import { Select, TextInput } from "@/components/ui/field";

export type LeadTableRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  stage: string;
  repName: string | null;
  createdAt: string; // ISO date
  notes: string | null;
};

export function LeadsTable({ rows }: { rows: LeadTableRow[] }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (stage && r.stage !== stage) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.company ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, stage]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone, company…"
          className="max-w-xs"
        />
        <Select value={stage} onChange={(e) => setStage(e.target.value)} className="max-w-[12rem]">
          <option value="">All statuses</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </Select>
        <span className="font-mono text-[0.7rem] text-text-faint">
          {filtered.length}/{rows.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[0.8rem]">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-text-faint">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-text-faint">
                  No leads match.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const style = LEAD_STAGE_STYLE[r.stage as keyof typeof LEAD_STAGE_STYLE];
                return (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover">
                    <td className="px-3 py-2">
                      <Link href={`/sales/crm/${r.id}`} className="font-bold text-accent-strong hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-text-dim">{r.email ?? "—"}</td>
                    <td className="px-3 py-2 text-text-dim">{r.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-text-dim">{r.company ?? "—"}</td>
                    <td className="px-3 py-2 text-text-dim">{r.source ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[0.68rem] font-bold"
                        style={{ backgroundColor: style?.wash, color: style?.text }}
                      >
                        {LEAD_STAGE_LABELS[r.stage as keyof typeof LEAD_STAGE_LABELS] ?? r.stage}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-text-dim">{r.repName ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-[0.74rem] text-text-faint">{r.createdAt}</td>
                    <td className="max-w-[20ch] truncate px-3 py-2 text-text-faint" title={r.notes ?? ""}>
                      {r.notes ?? "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
