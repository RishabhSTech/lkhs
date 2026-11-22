"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/admin/form-fields";
import { datePresets } from "@/lib/finance/period";

/**
 * "Any dates / This month / ... / Custom range" filter for lists. Presets
 * apply immediately; a custom range applies once both dates are set.
 */
export function DateRangeFilter({
  from,
  to,
  today,
  label = "Filter by date",
  onChange,
}: {
  from?: string;
  to?: string;
  /** "YYYY-MM-DD" */
  today: string;
  label?: string;
  onChange: (range: { from: string; to: string } | null) => void;
}) {
  const presets = datePresets(today);
  const matched = from && to ? presets.find((p) => p.from === from && p.to === to) : undefined;
  const active = !from || !to ? "" : (matched?.key ?? "custom");

  const [mode, setMode] = useState(active);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");
  const valid = Boolean(customFrom && customTo && customFrom <= customTo);
  const dirty = customFrom !== (from ?? "") || customTo !== (to ?? "");

  return (
    <>
      <div className="col-span-2 sm:w-44">
        <NativeSelect
          value={mode}
          aria-label={label}
          className="h-10 lg:h-9"
          onChange={(e) => {
            const next = e.target.value;
            setMode(next);
            if (next === "") onChange(null);
            const preset = presets.find((p) => p.key === next);
            if (preset) {
              setCustomFrom(preset.from);
              setCustomTo(preset.to);
              onChange({ from: preset.from, to: preset.to });
            }
          }}
        >
          <option value="">Any dates</option>
          {presets.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom range…</option>
        </NativeSelect>
      </div>

      {mode === "custom" && (
        <form
          className="col-span-2 flex flex-wrap items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onChange({ from: customFrom, to: customTo });
          }}
        >
          <Input
            type="date"
            aria-label="From"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-10 w-auto flex-1 sm:w-38 sm:flex-none lg:h-9"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-10 w-auto flex-1 sm:w-38 sm:flex-none lg:h-9"
          />
          <Button type="submit" size="sm" className="h-10 lg:h-9" disabled={!valid || (!dirty && active === "custom")}>
            Apply
          </Button>
        </form>
      )}
    </>
  );
}
