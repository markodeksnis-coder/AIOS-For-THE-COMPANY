"use client";

import { useState } from "react";
import Link from "next/link";
import { updateSalesCall } from "@/lib/actions/leads";
import { Card } from "@/components/ui/card";
import { Button, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  CALL_STATUSES,
  CALL_STATUS_LABELS,
  CALL_RESULTS,
  CALL_RESULT_LABELS,
  CALL_STATUS_TO_STAGE,
  CALL_RESULT_TO_STAGE,
  LEAD_STAGE_STYLE,
  callOutcomeLabel,
  toBerlinDatetimeLocal,
  type CallStatus,
  type CallResult,
} from "@/lib/crm";

export type CallRow = {
  id: string;
  leadId: string;
  leadName: string;
  scheduledAt: string;
  startedAt: string | null;
  rep: string | null;
  callStatus: string;
  result: string | null;
  cashCollected: number | null;
  notes: string | null;
};

export function CallsTable({ calls }: { calls: CallRow[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = statusFilter === "all" ? calls : calls.filter((c) => c.callStatus === statusFilter);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-52">
          <option value="all">All statuses</option>
          {CALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CALL_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
        <span className="font-mono text-[0.72rem] text-text-faint">{filtered.length} shown</span>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-center text-[0.83rem] text-text-faint">No calls match this filter.</div>
        )}
        {filtered.map((c) =>
          editingId === c.id ? (
            <EditCallRow key={c.id} call={c} onDone={() => setEditingId(null)} />
          ) : (
            <CallRowView key={c.id} call={c} onEdit={() => setEditingId(c.id)} />
          )
        )}
      </Card>
    </div>
  );
}

function CallRowView({ call: c, onEdit }: { call: CallRow; onEdit: () => void }) {
  const stage = c.result
    ? CALL_RESULT_TO_STAGE[c.result as CallResult]
    : CALL_STATUS_TO_STAGE[c.callStatus as CallStatus];
  const style = stage ? LEAD_STAGE_STYLE[stage] : undefined;

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] last:border-b-0">
      <span className="font-mono text-[0.72rem] text-text-faint">{c.scheduledAt}</span>
      <Link href={`/sales/crm/${c.leadId}`} className="flex-1 truncate font-bold hover:text-accent-strong hover:underline">
        {c.leadName}
      </Link>
      {c.rep && <span className="hidden font-mono text-[0.7rem] text-text-faint sm:block">{c.rep}</span>}
      {c.cashCollected ? (
        <span className="font-mono text-[0.72rem] font-bold text-good">${c.cashCollected.toLocaleString()}</span>
      ) : null}
      {c.notes && <span className="hidden truncate text-text-faint md:block md:max-w-[220px]">{c.notes}</span>}
      <span
        className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold"
        style={{ backgroundColor: style?.wash ?? "var(--surface-2)", color: style?.text ?? "var(--text-faint)" }}
      >
        {callOutcomeLabel(c.callStatus, c.result)}
      </span>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[0.74rem] font-semibold text-accent-strong hover:underline"
      >
        Edit
      </button>
    </div>
  );
}

function EditCallRow({ call: c, onDone }: { call: CallRow; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(c.callStatus as CallStatus);
  const [result, setResult] = useState<CallResult | "">((c.result as CallResult) ?? "");
  const showsResult = callStatus === "showed";

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await updateSalesCall(c.id, formData);
        setPending(false);
        onDone();
      }}
      className="flex flex-wrap items-end gap-2 border-b border-border bg-surface-hover px-4 py-3 text-[0.8rem] last:border-b-0"
    >
      <div className="w-40">
        <TextInput
          name="scheduledAt"
          type="datetime-local"
          defaultValue={toBerlinDatetimeLocal(new Date(c.startedAt ?? c.scheduledAt))}
        />
      </div>
      <div className="w-40">
        <Select
          name="callStatus"
          value={callStatus}
          onChange={(e) => {
            setCallStatus(e.target.value as CallStatus);
            setResult("");
          }}
        >
          {CALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CALL_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      {showsResult && (
        <div className="w-40">
          <Select name="result" value={result} onChange={(e) => setResult(e.target.value as CallResult | "")}>
            <option value="">— not yet —</option>
            {CALL_RESULTS.map((r) => (
              <option key={r} value={r}>
                {CALL_RESULT_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="w-28">
        <TextInput name="cashCollected" type="number" min="0" step="0.01" placeholder="Cash" defaultValue={c.cashCollected ?? ""} />
      </div>
      <div className="min-w-[160px] flex-1">
        <TextArea name="notes" rows={1} placeholder="Notes" defaultValue={c.notes ?? ""} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>
        Cancel
      </Button>
    </form>
  );
}
