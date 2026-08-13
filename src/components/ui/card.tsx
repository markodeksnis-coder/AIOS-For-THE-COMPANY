import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface backdrop-blur-xl",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_12px_28px_-14px_rgba(0,0,0,0.55)]",
        className
      )}
      {...props}
    />
  );
}
