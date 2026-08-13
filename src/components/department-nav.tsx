"use client";

import { useEffect, useState } from "react";
import { NavLink } from "@/components/nav-primitives";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";
import { loadSettings, SETTINGS_CHANGED_EVENT } from "@/lib/settings";

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
        <NavLink key={d.slug} href={`/departments/${d.department}`}>
          {DEPARTMENT_LABELS[d.department] ?? d.department}
        </NavLink>
      ))}
    </>
  );
}
