"use client";

import { useId, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SCALE = [1, 2, 3, 4, 5];

/**
 * Five-star picker built on a real radio group: arrow keys, tab order and
 * screen-reader labels come for free, and it still submits inside a plain
 * form if scripting is unavailable.
 */
export function StarInput({
  label,
  name,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  name: string;
  value: number | null;
  onChange: (value: number) => void;
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value ?? 0;

  return (
    <div
      role="radiogroup"
      aria-labelledby={id}
      aria-required={required}
      className="flex items-center justify-between gap-4"
    >
      <div className="min-w-0">
        <span id={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-brand-azure"> *</span>}
        </span>
        {hint && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {hint}
          </span>
        )}
      </div>

      <div className="flex shrink-0" onMouseLeave={() => setHovered(null)}>
        {SCALE.map((star) => (
          <label
            key={star}
            className="cursor-pointer p-0.5"
            onMouseEnter={() => setHovered(star)}
          >
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="peer sr-only"
            />
            <span className="sr-only">
              {star} {star === 1 ? "star" : "stars"}
            </span>
            <Star
              className={cn(
                "size-6 transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 rounded-sm",
                star <= shown
                  ? "fill-brand-gold text-brand-gold"
                  : "fill-transparent text-input",
              )}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
