import { Card } from "@/components/ui/card";

const TONE_CLASS: Record<"good" | "warn" | "crit" | "default", string> = {
  good: "text-good",
  warn: "text-warn",
  crit: "text-critical",
  default: "text-foreground",
};

export function KpiTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "crit" | "default";
}) {
  return (
    <Card className="flex flex-col gap-0.5 p-3.5">
      <span className="text-[0.68rem] text-text-faint">{label}</span>
      <span className={`mt-0.5 font-mono text-[1.15rem] font-bold tracking-tight ${TONE_CLASS[tone]}`}>{value}</span>
      {sub && <span className={`text-[0.68rem] ${tone === "crit" ? "text-critical" : "text-text-faint"}`}>{sub}</span>}
    </Card>
  );
}
