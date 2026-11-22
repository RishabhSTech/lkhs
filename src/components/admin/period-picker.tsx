"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PeriodKind } from "@/lib/finance/period";

const PERIOD_KEYS = ["period", "month", "year", "from", "to"];

const TABS: { kind: PeriodKind; label: string }[] = [
  { kind: "month", label: "Monthly" },
  { kind: "year", label: "Yearly" },
  { kind: "custom", label: "Custom" },
];

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/**
 * Monthly / Yearly / Custom range switcher. The period lives in the URL, so
 * the server page re-renders with it and exports pick it up. Other search
 * params on the page (filters, tabs) are preserved.
 */
export function PeriodPicker({
  kind,
  from,
  to,
  label,
}: {
  kind: PeriodKind;
  /** ISO dates of the active period. */
  from: string;
  to: string;
  label: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // The custom tab can be opened without navigating until dates are applied.
  const [tab, setTab] = useState<PeriodKind>(kind);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const month = from.slice(0, 7);
  const year = Number(from.slice(0, 4));

  function go(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of PERIOD_KEYS) params.delete(key);
    for (const [k, v] of Object.entries(next)) params.set(k, v);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function selectTab(next: PeriodKind) {
    setTab(next);
    if (next === "month") go({ period: "month", month });
    if (next === "year") go({ period: "year", year: String(year) });
    if (next === "custom") {
      setCustomFrom(from);
      setCustomTo(to);
    }
  }

  const customValid = Boolean(customFrom && customTo && customFrom <= customTo);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Reporting period" className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((t) => (
          <Button
            key={t.kind}
            type="button"
            role="tab"
            aria-selected={tab === t.kind}
            variant="ghost"
            size="xs"
            onClick={() => selectTab(t.kind)}
            className={cn(tab === t.kind && "bg-muted text-foreground")}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "month" && (
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" aria-label="Previous month" onClick={() => go({ period: "month", month: shiftMonth(month, -1) })}>
            <ChevronLeft />
          </Button>
          <Input
            type="month"
            aria-label="Month"
            value={month}
            onChange={(e) => e.target.value && go({ period: "month", month: e.target.value })}
            className="w-40"
          />
          <Button type="button" variant="outline" size="icon-sm" aria-label="Next month" onClick={() => go({ period: "month", month: shiftMonth(month, 1) })}>
            <ChevronRight />
          </Button>
        </div>
      )}

      {tab === "year" && (
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" aria-label="Previous year" onClick={() => go({ period: "year", year: String(year - 1) })}>
            <ChevronLeft />
          </Button>
          <span className="min-w-14 text-center text-sm font-medium tabular-nums">{year}</span>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Next year" onClick={() => go({ period: "year", year: String(year + 1) })}>
            <ChevronRight />
          </Button>
        </div>
      )}

      {tab === "custom" && (
        <form
          className="flex flex-wrap items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (customValid) go({ period: "custom", from: customFrom, to: customTo });
          }}
        >
          <Input type="date" aria-label="From" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="w-38" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" aria-label="To" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="w-38" />
          <Button type="submit" size="sm" disabled={!customValid}>
            Apply
          </Button>
        </form>
      )}

      <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        {pending && <Loader2 className="size-3 animate-spin" />}
        {/* Month and year are already spelled out by their controls. */}
        {kind === "custom" && tab === "custom" ? label : null}
      </span>
    </div>
  );
}
