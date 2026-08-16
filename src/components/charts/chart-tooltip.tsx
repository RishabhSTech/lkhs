"use client";

import { formatINR } from "@/lib/format";

type TooltipEntry = {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
};

/**
 * Recharts injects `active`/`payload`/`label` at render time, so they are
 * optional here and the formatters are what callers actually pass.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = formatINR,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">
        {labelFormatter ? labelFormatter(String(label)) : String(label)}
      </p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((entry, i) => (
          <li
            key={String(entry.dataKey ?? i)}
            className="flex items-center gap-2 text-sm"
          >
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {valueFormatter(Number(entry.value))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
