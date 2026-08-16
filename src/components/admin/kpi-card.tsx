import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "warning" | "critical";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        tone === "warning" && "border-chart-4/40",
        tone === "critical" && "border-destructive/40",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
      </div>
      <p
        className={cn(
          "mt-2 font-heading text-2xl leading-none",
          tone === "critical" ? "text-destructive" : "text-brand-green",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
