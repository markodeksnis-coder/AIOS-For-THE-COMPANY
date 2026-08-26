"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { NewLeadForm } from "@/components/crm/new-lead-form";
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_STAGE_STYLE, formatCET } from "@/lib/crm";
import { moveLead } from "@/lib/actions/leads";

export type LeadRow = {
  id: string;
  name: string;
  stage: string;
  dealValue: number | null;
  nextCallAt: string | null; // ISO string
  stageChangedAt: string; // ISO string
};

export function CrmBoard({ leads }: { leads: LeadRow[] }) {
  const [columns, setColumns] = useState<Record<string, LeadRow[]>>(() => groupByStage(leads));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setColumns(groupByStage(leads)), [leads]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeStage = findCardStage(columns, String(active.id));
    const overStage = findCardStage(columns, String(over.id)) ?? String(over.id);
    if (!activeStage || !LEAD_STAGES.includes(overStage as never)) return;

    let rollback: Record<string, LeadRow[]> | null = null;
    let movedId: string | null = null;
    let destIds: string[] = [];

    setColumns((prev) => {
      const next = { ...prev };
      const sourceList = [...next[activeStage]];
      const movedIndex = sourceList.findIndex((l) => l.id === active.id);
      if (movedIndex === -1) return prev;
      const [moved] = sourceList.splice(movedIndex, 1);

      const destList = activeStage === overStage ? sourceList : [...next[overStage]];
      const overIndex = destList.findIndex((l) => l.id === over.id);
      const insertAt = overIndex === -1 ? destList.length : overIndex;
      destList.splice(insertAt, 0, { ...moved, stage: overStage });

      next[activeStage] = activeStage === overStage ? destList : sourceList;
      next[overStage] = destList;

      rollback = prev;
      movedId = moved.id;
      destIds = destList.map((l) => l.id);

      return next;
    });

    if (!movedId) return;
    setError(null);
    // A failed write (invalid stage, a transient DB error) must not leave the
    // card sitting in the wrong column with nothing telling the rep it didn't
    // actually save — revert the optimistic move and surface why.
    moveLead(movedId, overStage, destIds).catch((err) => {
      if (rollback) setColumns(rollback);
      setError(err instanceof Error ? err.message : "Couldn't move that lead — try again.");
    });
  }

  const activeLead = activeId
    ? Object.values(columns)
        .flat()
        .find((l) => l.id === activeId)
    : null;

  return (
    <div>
      <NewLeadForm />
      {error && <p className="mb-3 text-[0.78rem] text-critical">{error}</p>}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-5 overflow-x-auto pb-2">
          {LEAD_STAGES.map((stage) => {
            const style = LEAD_STAGE_STYLE[stage];
            const inColumn = columns[stage] ?? [];
            const columnValue = inColumn.reduce((sum, l) => sum + (l.dealValue ?? 0), 0);
            return (
              <div key={stage} className="w-[200px] shrink-0">
                <div className="mb-3 px-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: style.bar, boxShadow: `0 0 9px -1px ${style.bar}` }}
                    />
                    <h2 className="text-[0.78rem] font-bold leading-tight text-foreground">
                      {LEAD_STAGE_LABELS[stage]}
                    </h2>
                    <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-[0.05rem] font-mono text-[0.62rem] font-bold text-text-faint">
                      {inColumn.length}
                    </span>
                  </div>
                  <div
                    className="mt-1 pl-4 font-mono text-[0.7rem] font-bold"
                    style={{ color: columnValue > 0 ? style.bar : "var(--text-faint)" }}
                  >
                    ${columnValue.toLocaleString()}
                  </div>
                </div>
                <SortableContext items={inColumn.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <DroppableColumn stage={stage} empty={inColumn.length === 0}>
                    {inColumn.map((l) => (
                      <SortableLeadCard key={l.id} lead={l} />
                    ))}
                    {inColumn.length === 0 && (
                      <p className="px-2 py-4 text-center text-[0.72rem] text-text-faint">Drop leads here</p>
                    )}
                  </DroppableColumn>
                </SortableContext>
              </div>
            );
          })}
        </div>
        <DragOverlay>{activeLead ? <LeadCard lead={activeLead} dragging /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function LeadCard({ lead, dragging = false }: { lead: LeadRow; dragging?: boolean }) {
  const style = LEAD_STAGE_STYLE[lead.stage as keyof typeof LEAD_STAGE_STYLE];
  const daysInStage = Math.max(0, Math.floor((Date.now() - new Date(lead.stageChangedAt).getTime()) / 86_400_000));

  return (
    <Card
      className={
        "group relative overflow-hidden p-3.5 shadow-sm transition-all " +
        (dragging ? "rotate-2 scale-105 shadow-2xl" : "hover:-translate-y-0.5 hover:border-accent hover:shadow-md")
      }
    >
      <span className="absolute inset-y-0 left-0 w-1 rounded-r-full" style={{ backgroundColor: style?.bar }} aria-hidden />
      <div className="pl-2.5">
        <h3 className="mb-2 truncate text-[0.84rem] font-bold leading-tight">{lead.name}</h3>

        <div className="flex flex-col gap-1.5">
          <CardField
            label="Deal value"
            value={lead.dealValue ? `$${lead.dealValue.toLocaleString()}` : "—"}
            valueColor={lead.dealValue ? style?.bar : undefined}
          />
          <CardField label="In stage" value={`${daysInStage}d`} />
          <CardField label="Next action" value={lead.nextCallAt ? formatCET(new Date(lead.nextCallAt)) : "—"} />
        </div>
      </div>
    </Card>
  );
}

/** Label stacked above value, never side-by-side — a real next-action
 *  timestamp ("24 Aug, 14:30 GMT+2") is too wide to sit next to its label
 *  inside a ~190px kanban column without wrapping mid-word. */
function CardField({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <div className="font-mono text-[0.58rem] uppercase tracking-wide text-text-faint">{label}</div>
      <div className="truncate font-mono text-[0.72rem] font-bold" style={{ color: valueColor ?? "var(--foreground)" }}>
        {value}
      </div>
    </div>
  );
}

function SortableLeadCard({ lead }: { lead: LeadRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { stage: lead.stage },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link href={`/sales/crm/${lead.id}`} onClick={(e) => isDragging && e.preventDefault()} draggable={false}>
        <LeadCard lead={lead} />
      </Link>
    </div>
  );
}

function DroppableColumn({ stage, empty, children }: { stage: string; empty: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className="flex min-h-[64px] flex-col gap-2 rounded-2xl border border-dashed p-1.5 transition-colors"
      style={{ borderColor: isOver ? "var(--accent)" : empty ? "var(--border)" : "transparent" }}
    >
      {children}
    </div>
  );
}

function groupByStage(leads: LeadRow[]): Record<string, LeadRow[]> {
  const grouped: Record<string, LeadRow[]> = {};
  for (const stage of LEAD_STAGES) grouped[stage] = [];
  for (const l of leads) (grouped[l.stage] ??= []).push(l);
  return grouped;
}

function findCardStage(columns: Record<string, LeadRow[]>, id: string): string | null {
  for (const [stage, list] of Object.entries(columns)) {
    if (list.some((l) => l.id === id)) return stage;
  }
  return null;
}
