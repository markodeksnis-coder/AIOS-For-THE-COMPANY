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
import { LEAD_STAGES, LEAD_STAGE_LABELS, LEAD_STAGE_STYLE, parseTags, tagColor } from "@/lib/crm";
import { moveLead } from "@/lib/actions/leads";

export type LeadRow = {
  id: string;
  name: string;
  source: string | null;
  repName: string | null;
  stage: string;
  tags: string;
  dealValue: number | null;
  stageProbability: number | null;
  cashCollected: number;
  noShowCount: number;
};

export function CrmBoard({ leads }: { leads: LeadRow[] }) {
  const [columns, setColumns] = useState<Record<string, LeadRow[]>>(() => groupByStage(leads));
  const [activeId, setActiveId] = useState<string | null>(null);

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

      void moveLead(
        moved.id,
        overStage,
        destList.map((l) => l.id)
      );

      return next;
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {LEAD_STAGES.map((stage) => {
            const style = LEAD_STAGE_STYLE[stage];
            const inColumn = columns[stage] ?? [];
            return (
              <div key={stage} className="min-w-[200px]">
                <div
                  className="mb-2.5 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                  style={{ backgroundColor: style.wash }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: style.bar }} />
                  <h2 className="text-[0.72rem] font-bold leading-tight" style={{ color: style.text }}>
                    {LEAD_STAGE_LABELS[stage]}
                  </h2>
                  <span className="ml-auto font-mono text-[0.65rem] text-text-faint">{inColumn.length}</span>
                </div>
                <SortableContext items={inColumn.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <DroppableColumn stage={stage} empty={inColumn.length === 0}>
                    {inColumn.map((l) => (
                      <SortableLeadCard key={l.id} lead={l} />
                    ))}
                    {inColumn.length === 0 && (
                      <p className="px-2 py-3 text-center text-[0.72rem] text-text-faint">Drop here</p>
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
  const tags = parseTags(lead.tags);
  const style = LEAD_STAGE_STYLE[lead.stage as keyof typeof LEAD_STAGE_STYLE];
  const ev =
    lead.dealValue && lead.stageProbability ? Math.round(lead.dealValue * (lead.stageProbability / 100)) : null;

  return (
    <Card
      className={
        "group relative overflow-hidden p-3 transition-all " +
        (dragging ? "rotate-2 scale-105 shadow-2xl" : "hover:border-accent hover:-translate-y-0.5")
      }
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: style?.bar }} aria-hidden />
      <div className="pl-2">
        <h3 className="mb-1.5 text-[0.82rem] font-bold leading-tight">{lead.name}</h3>

        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide"
                style={{ backgroundColor: `${tagColor(t)}22`, color: tagColor(t) }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[0.62rem] text-text-faint">
          {lead.repName && <span className="truncate">{lead.repName}</span>}
          {ev !== null && <span className="font-bold text-accent-strong">EV ${ev.toLocaleString()}</span>}
          {lead.cashCollected > 0 && (
            <span className="font-bold text-good">${lead.cashCollected.toLocaleString()}</span>
          )}
          {lead.noShowCount > 0 && (
            <span className="font-bold text-critical">no-show ×{lead.noShowCount}</span>
          )}
        </div>
      </div>
    </Card>
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
      className="flex min-h-[60px] flex-col gap-2 rounded-xl border border-dashed p-1 transition-colors"
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
