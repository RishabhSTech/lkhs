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
        "group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-ring/40",
        className,
      )}
    >
      {/* Left rule carries tone without tinting the whole tile. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-0.5",
          tone === "critical"
            ? "bg-destructive"
            : tone === "warning"
              ? "bg-chart-4"
              : "bg-transparent",
        )}
      />

      <div className="flex items-start justify-between gap-2">
        <p className="label-eyebrow leading-tight">{label}</p>
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/60" />
        )}
      </div>

      <p
        className={cn(
          "mt-2.5 font-heading text-[1.625rem] leading-none tabular-nums",
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
