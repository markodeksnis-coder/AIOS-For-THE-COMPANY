"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER } from "@/lib/brain";
import {
  ACCENT_PRESETS,
  DEFAULT_SETTINGS,
  FONT_SIZE_LABELS,
  FontSize,
  Settings,
  Theme,
  loadSettings,
  saveSettings,
} from "@/lib/settings";
import type { DeptRow } from "@/components/department-nav";

const THEME_OPTIONS: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];

export function SettingsForm({ departments }: { departments: DeptRow[] }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setMounted(true);
  }, []);

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  }

  const order = settings.departmentOrder ?? DEPARTMENT_ORDER;
  const orderedDepts = [...departments].sort((a, b) => {
    const ai = order.indexOf(a.department);
    const bi = order.indexOf(b.department);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  function move(deptSlug: string, dir: -1 | 1) {
    const current = orderedDepts.map((d) => d.department);
    const i = current.indexOf(deptSlug);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= current.length) return;
    [current[i], current[j]] = [current[j], current[i]];
    update({ departmentOrder: current });
  }

  // Avoid a flash of default-selected controls before the real saved settings load.
  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Theme
        </h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => update({ theme: opt.id })}
              className={
                "rounded-lg border px-4 py-2 text-[0.83rem] font-semibold transition-colors " +
                (settings.theme === opt.id
                  ? "border-accent bg-accent-wash text-accent-strong"
                  : "border-border bg-surface text-text-dim hover:border-accent")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Font size
        </h2>
        <div className="flex gap-2">
          {(Object.keys(FONT_SIZE_LABELS) as FontSize[]).map((size) => (
            <button
              key={size}
              onClick={() => update({ fontSize: size })}
              className={
                "rounded-lg border px-4 py-2 text-[0.83rem] font-semibold transition-colors " +
                (settings.fontSize === size
                  ? "border-accent bg-accent-wash text-accent-strong"
                  : "border-border bg-surface text-text-dim hover:border-accent")
              }
            >
              {FONT_SIZE_LABELS[size]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Accent color
        </h2>
        <div className="flex gap-2">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => update({ accent: preset.id })}
              title={preset.label}
              className={
                "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform " +
                (settings.accent === preset.id
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105")
              }
            >
              <span
                className="h-[26px] w-[26px] rounded-full"
                style={{ backgroundColor: preset.swatch }}
              />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
          Department order — first team shown, first in the sidebar
        </h2>
        <Card className="overflow-hidden">
          {orderedDepts.map((d, i) => (
            <div
              key={d.slug}
              className="flex items-center gap-3 border-b border-border px-4 py-2.5 text-[0.83rem] last:border-b-0"
            >
              <span className="w-5 font-mono text-text-faint">{i + 1}</span>
              <span className="flex-1 font-bold">
                {DEPARTMENT_LABELS[d.department] ?? d.department}
              </span>
              <button
                onClick={() => move(d.department, -1)}
                disabled={i === 0}
                aria-label={`Move ${DEPARTMENT_LABELS[d.department] ?? d.department} up`}
                className="rounded border border-border px-1.5 py-0.5 text-text-dim hover:border-accent disabled:cursor-not-allowed disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => move(d.department, 1)}
                disabled={i === orderedDepts.length - 1}
                aria-label={`Move ${DEPARTMENT_LABELS[d.department] ?? d.department} down`}
                className="rounded border border-border px-1.5 py-0.5 text-text-dim hover:border-accent disabled:cursor-not-allowed disabled:opacity-30"
              >
                ↓
              </button>
            </div>
          ))}
        </Card>
        <button
          onClick={() => update({ departmentOrder: null })}
          className="mt-2 text-[0.78rem] text-text-faint hover:text-accent"
        >
          Reset to default order
        </button>
      </section>
    </div>
  );
}
