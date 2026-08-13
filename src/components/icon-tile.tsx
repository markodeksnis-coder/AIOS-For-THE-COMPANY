import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function IconTile({
  icon: Icon,
  gradient,
  size = "md",
  className,
}: {
  icon: LucideIcon;
  gradient: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const dims = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  const iconSize = size === "sm" ? 13 : 18;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)]",
        dims,
        className
      )}
      style={{ backgroundImage: gradient }}
    >
      <Icon size={iconSize} strokeWidth={2.25} />
    </span>
  );
}
