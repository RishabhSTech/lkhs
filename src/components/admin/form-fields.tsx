"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Touch-first form primitives for the back office. Every control is at least
 * 44px tall on phones and uses a 16px font there, so iOS never zooms the page
 * when a field takes focus.
 */

export const fieldControlClass =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-base text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 lg:h-10 lg:text-sm";

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-primary"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select {...props} className={cn(fieldControlClass, "appearance-none pr-9", className)}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </span>
  );
}

export function ChipGroup<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm font-medium transition-colors lg:h-9",
              active
                ? "border-primary bg-primary text-white"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 16,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="grid size-9 place-items-center rounded-full border border-border text-foreground disabled:opacity-30"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-5 text-center text-base font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="grid size-9 place-items-center rounded-full border border-border text-foreground disabled:opacity-30"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/8 px-3 py-2.5 text-sm text-destructive">
      {children}
    </p>
  );
}

/** Parses a typed amount; tolerates commas and a leading ₹. */
export function parseAmount(raw: string) {
  const n = Number(raw.replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function todayISO() {
  // IST date, since that's where the properties and the team are.
  return new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
}
