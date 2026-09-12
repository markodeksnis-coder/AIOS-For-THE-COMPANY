"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/field";
import { assignDeliverySystem } from "@/lib/actions/delivery";
import { computeAssignVerdict, type WizardAnswers } from "@/lib/delivery";

const EMPTY: WizardAnswers = { budget: null, automation: null, platform: null };

export function AssignWizard({ client }: { client: { id: string; name: string; business: string } | null }) {
  const [w, setW] = useState<WizardAnswers>(EMPTY);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const verdict = computeAssignVerdict(w);

  const steps = [
    {
      num: "1",
      question: "Can they spend $400+/month on tools and infrastructure?",
      hint: "Budget gates everything. Answer this before anything else.",
      active: true,
      skipped: false,
      skipReason: "",
      options: [
        ["yes", "Yes — $400+/mo"],
        ["no", "No — under $400/mo"],
      ] as const,
      picked: w.budget,
      onPick: (v: string) => setW({ budget: v as WizardAnswers["budget"], automation: null, platform: null }),
    },
    {
      num: "2",
      question: "Maximum automation, or comfortable with manual?",
      hint: "Only asked when the budget clears.",
      active: w.budget === "yes",
      skipped: w.budget === "no",
      skipReason: "Skipped — budget already determined the answer.",
      options: [
        ["max", "Maximum automation"],
        ["manual", "Comfortable with manual"],
      ] as const,
      picked: w.automation,
      onPick: (v: string) => setW((s) => ({ ...s, automation: v as WizardAnswers["automation"], platform: null })),
    },
    {
      num: "3",
      question: "Where does their ideal client hang out?",
      hint: "Platform decides the channel, and the channel decides the launch date.",
      active: w.budget === "yes" && w.automation === "manual",
      skipped: w.budget === "no" || w.automation === "max",
      skipReason: w.budget === "no" ? "Skipped — budget already determined the answer." : "Skipped — maximum automation already determined the answer.",
      options: [
        ["b2c", "Gyms, local, B2C → IG + FB"],
        ["b2b", "Agencies, consultants, B2B → LinkedIn"],
        ["unclear", "Mixed or unclear"],
      ] as const,
      picked: w.platform,
      onPick: (v: string) => setW((s) => ({ ...s, platform: v as WizardAnswers["platform"] })),
    },
  ];

  return (
    <div className="flex max-w-[860px] flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 px-[18px] backdrop-blur-xl">
        <span className="text-[0.88rem] font-extrabold">
          {client ? `Assigning for ${client.name} · ${client.business}` : "No client is awaiting assignment"}
        </span>
        <span className="text-pretty text-[0.8rem] text-text-dim">
          You assign the system. The client confirms. They do not choose — so this walks the three questions in order and
          stops the moment the answer is determined.
        </span>
      </div>

      {steps.map((q) => (
        <div
          key={q.num}
          className="flex flex-col gap-3 rounded-2xl border bg-surface p-[15px] px-[17px] backdrop-blur-xl"
          style={{ borderColor: q.active && !q.skipped ? "rgba(136,144,238,.35)" : "var(--border)", opacity: q.skipped ? 0.55 : 1 }}
        >
          <div className="flex items-baseline gap-2.5">
            <span
              className="grid h-6 w-6 flex-none place-items-center rounded-full border font-mono text-[0.7rem] font-bold"
              style={{ borderColor: q.active && !q.skipped ? "var(--accent)" : "rgba(255,255,255,.14)", color: q.active && !q.skipped ? "var(--accent-strong)" : "var(--text-faint)" }}
            >
              {q.num}
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[0.9rem] font-extrabold tracking-tight">{q.question}</span>
              <span className="text-[0.76rem] text-text-faint">{q.hint}</span>
            </div>
          </div>
          {q.active && !q.skipped && (
            <div className="flex flex-wrap gap-2 pl-[34px]">
              {q.options.map(([value, label]) => {
                const picked = q.picked === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => q.onPick(value)}
                    className="rounded-[10px] border px-3.5 py-1.5 text-[0.8rem] font-bold transition-colors"
                    style={{
                      borderColor: picked ? "var(--accent)" : "rgba(255,255,255,.12)",
                      backgroundColor: picked ? "var(--accent-wash)" : "transparent",
                      color: picked ? "var(--accent-strong)" : "#cfd2e0",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {q.skipped && <div className="pl-[34px] text-[0.78rem] text-text-faint">{q.skipReason}</div>}
        </div>
      ))}

      {verdict && client && (
        <div className="flex flex-col gap-3 rounded-2xl border border-good/40 bg-good-wash p-[18px] backdrop-blur-xl">
          <span className="font-mono text-[0.62rem] uppercase tracking-widest text-good">Assigned system</span>
          <span className="text-[1.25rem] font-extrabold tracking-tight">{verdict.system}</span>
          <span className="text-pretty max-w-[70ch] text-[0.83rem] text-foreground/85">{verdict.why}</span>
          <div className="grid grid-cols-3 gap-2.5">
            {verdict.facts.map((f) => (
              <div key={f.label} className="flex flex-col gap-0.5 rounded-[11px] border border-border p-2.5">
                <span className="text-[0.66rem] text-text-faint">{f.label}</span>
                <span className="font-mono text-[0.85rem] font-bold">{f.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await assignDeliverySystem(client.id, verdict.system, verdict.platform);
                  router.push(`/delivery/journey/${client.id}`);
                })
              }
            >
              {pending ? "Assigning…" : "Assign & generate homework"}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setW(EMPTY)}>
              Start over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
