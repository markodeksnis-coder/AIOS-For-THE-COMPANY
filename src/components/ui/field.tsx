import { cn } from "@/lib/utils";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block font-mono text-[0.68rem] uppercase tracking-widest text-text-faint">
      {children}
    </label>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[0.86rem] text-foreground placeholder:text-text-faint focus:border-accent focus:outline-none",
        props.className
      )}
    />
  );
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[0.86rem] text-foreground placeholder:text-text-faint focus:border-accent focus:outline-none",
        props.className
      )}
    />
  );
}

export function Select(props: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-[0.86rem] text-foreground focus:border-accent focus:outline-none",
        props.className
      )}
    />
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-accent text-on-accent hover:bg-accent-strong",
    ghost: "border border-border text-text-dim hover:border-accent hover:text-foreground",
    danger: "border border-critical/40 text-critical hover:bg-critical/10",
  };
  return (
    <button
      {...props}
      className={cn(
        "rounded-lg px-3.5 py-2 text-[0.83rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className
      )}
    />
  );
}
