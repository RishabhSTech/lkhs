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
        "group relative overflow-hidden soft-card p-4",
        className,
      )}
      // A gentle wash instead of a hard coloured rule when something needs a look.
      style={
        tone === "critical"
          ? { backgroundColor: "color-mix(in oklch, var(--destructive) 7%, var(--card))" }
          : tone === "warning"
            ? { backgroundColor: "color-mix(in oklch, var(--chart-4) 9%, var(--card))" }
            : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="label-eyebrow leading-tight">{label}</p>
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/60" />
        )}
      </div>

      <p
        className={cn(
          "mt-2.5 text-[1.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums",
          tone === "critical" ? "text-destructive" : "text-foreground",
        )}
      >
        {value}
      </p>

      {hint && (
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
