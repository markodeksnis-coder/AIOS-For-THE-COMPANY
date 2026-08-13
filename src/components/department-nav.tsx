"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconTile } from "@/components/icon-tile";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";
import { DEPARTMENT_ICONS, DEPARTMENT_GRADIENTS } from "@/lib/department-style";
import { loadSettings, SETTINGS_CHANGED_EVENT } from "@/lib/settings";
import { Building2 } from "lucide-react";

export type DeptRow = { slug: string; department: string };

function orderRows(rows: DeptRow[], order: string[] | null): DeptRow[] {
  const priority = order ?? DEPARTMENT_ORDER;
  return [...rows].sort((a, b) => {
    const ai = priority.indexOf(a.department);
    const bi = priority.indexOf(b.department);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function DepartmentNav({ departments }: { departments: DeptRow[] }) {
  // Server-rendered default order first (matches SSR output, avoids hydration
  // mismatch); swapped for the saved custom order right after mount.
  const [order, setOrder] = useState<string[] | null>(null);

  useEffect(() => {
    setOrder(loadSettings().departmentOrder);
    const onChange = () => setOrder(loadSettings().departmentOrder);
    window.addEventListener(SETTINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange);
  }, []);

  const sorted = orderRows(departments, order);

  return (
    <>
      {sorted.map((d) => (
        <Link
          key={d.slug}
          href={`/departments/${d.department}`}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.83rem] font-semibold text-text-dim transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <IconTile
            icon={DEPARTMENT_ICONS[d.department] ?? Building2}
            gradient={DEPARTMENT_GRADIENTS[d.department] ?? "linear-gradient(135deg, #64748B, #94A3B8)"}
            size="sm"
          />
          <span className="flex-1">{DEPARTMENT_LABELS[d.department] ?? d.department}</span>
        </Link>
      ))}
    </>
  );
}
