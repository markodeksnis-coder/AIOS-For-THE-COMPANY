"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDebrief } from "@/lib/actions/debriefs";
import { Card } from "@/components/ui/card";
import { Button, Label, Select, TextArea, TextInput } from "@/components/ui/field";
import {
  CLOSER_STEPS,
  CLOSER_STEP_LABELS,
  OBJECTION_TYPES,
  OBJECTION_TYPE_LABELS,
  ROOT_CAUSES,
  ROOT_CAUSE_LABELS,
  type ObjectionType,
} from "@/lib/crm";

export type DebriefValues = {
  endReason: string | null;
  notEstablished: string | null;
  scriptAdherence: number | null;
  weakestStep: string | null;
  prospectDream: string | null;
  prospectBlocker: string | null;
  commitmentScore: number | null;
  finalObjection: string | null;
  objectionType: string | null;
  objectionOther: string | null;
  doubtMoment: string | null;
  replayMoment: string | null;
  rootCause: string | null;
};

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);

function ScoreSelect({ name, defaultValue }: { name: string; defaultValue: number | null }) {
  return (
    <Select name={name} defaultValue={defaultValue ?? ""}>
      <option value="">—</option>
      {SCORES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  );
}

export function DebriefForm({ callId, leadId, initial }: { callId: string; leadId: string; initial: DebriefValues }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [objectionType, setObjectionType] = useState<ObjectionType | "">(
    (initial.objectionType as ObjectionType) ?? ""
  );

  return (
    <form
      action={async (formData) => {
        setPending(true);
        await saveDebrief(callId, formData);
        setPending(false);
        router.push(`/sales/crm/${leadId}`);
      }}
      className="flex flex-col gap-5"
    >
      <Card className="p-4">
        <h2 className="mb-3 text-[0.8rem] font-bold">Outcome & cause</h2>
        <div className="flex flex-col gap-3">
          <div>
            <Label>In one sentence, why did it end that way?</Label>
            <TextInput name="endReason" defaultValue={initial.endReason ?? ""} />
          </div>
          <div>
            <Label>What did I not establish enough to make the follow-up call necessary or force a no-close?</Label>
            <TextArea name="notEstablished" rows={2} defaultValue={initial.notEstablished ?? ""} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-[0.8rem] font-bold">Script & structure</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Followed the script start to finish? (1–10)</Label>
            <ScoreSelect name="scriptAdherence" defaultValue={initial.scriptAdherence} />
          </div>
          <div>
            <Label>Which part felt weakest?</Label>
            <Select name="weakestStep" defaultValue={initial.weakestStep ?? ""}>
              <option value="">—</option>
              {CLOSER_STEPS.map((s) => (
                <option key={s} value={s}>
                  {CLOSER_STEP_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-[0.8rem] font-bold">Understanding the prospect</h2>
        <div className="flex flex-col gap-3">
          <div>
            <Label>In THEIR exact words, what is their dream outcome?</Label>
            <TextArea name="prospectDream" rows={2} defaultValue={initial.prospectDream ?? ""} />
          </div>
          <div>
            <Label>What did they say is really holding them back right now?</Label>
            <TextArea name="prospectBlocker" rows={2} defaultValue={initial.prospectBlocker ?? ""} />
          </div>
          <div className="max-w-[160px]">
            <Label>Commitment to fix it (1–10)</Label>
            <ScoreSelect name="commitmentScore" defaultValue={initial.commitmentScore} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-[0.8rem] font-bold">Objections & friction</h2>
        <div className="flex flex-col gap-3">
          <div>
            <Label>The final objection that stopped the sale (exact sentence)</Label>
            <TextInput name="finalObjection" defaultValue={initial.finalObjection ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>What was the real objection?</Label>
              <Select
                name="objectionType"
                value={objectionType}
                onChange={(e) => setObjectionType(e.target.value as ObjectionType)}
              >
                <option value="">—</option>
                {OBJECTION_TYPES.map((o) => (
                  <option key={o} value={o}>
                    {OBJECTION_TYPE_LABELS[o]}
                  </option>
                ))}
              </Select>
            </div>
            {objectionType === "other" && (
              <div>
                <Label>What was it?</Label>
                <TextInput name="objectionOther" defaultValue={initial.objectionOther ?? ""} />
              </div>
            )}
          </div>
          <div>
            <Label>At what moment did their energy/doubt first show up? What did I say right before that?</Label>
            <TextArea name="doubtMoment" rows={2} defaultValue={initial.doubtMoment ?? ""} />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-[0.8rem] font-bold">My performance</h2>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Replay 60 seconds to change the outcome — which 60 seconds, and what would I say instead?</Label>
            <TextArea name="replayMoment" rows={2} defaultValue={initial.replayMoment ?? ""} />
          </div>
          <div className="max-w-[280px]">
            <Label>Was this mainly a script, skill, or lead issue? Pick one.</Label>
            <Select name="rootCause" defaultValue={initial.rootCause ?? ""}>
              <option value="">—</option>
              {ROOT_CAUSES.map((r) => (
                <option key={r} value={r}>
                  {ROOT_CAUSE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save debrief"}
      </Button>
    </form>
  );
}
