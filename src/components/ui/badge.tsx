import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-2 text-text-faint",
        sample: "border-transparent bg-warn-wash text-warn",
        good: "border-transparent bg-good-wash text-good",
        accent: "border-transparent bg-accent-wash text-accent-strong",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
