"use client";

import { REVIEW_TOPICS } from "@/lib/property/review-topics";
import { cn } from "@/lib/utils";

/** Beyond this the chips stop summarising and start listing. */
export const MAX_TOPICS = 5;

/**
 * "What stood out?" - the optional topic tags on a review. Anything ticked
 * here wins over the keyword matching that otherwise infers the chips, so a
 * reviewer or an admin can always correct what the listing ends up claiming
 * the review is about.
 */
export function TopicPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(code: string) {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else if (value.length < MAX_TOPICS) {
      onChange([...value, code]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REVIEW_TOPICS.map((topic) => {
        const active = value.includes(topic.code);
        const disabled = !active && value.length >= MAX_TOPICS;
        return (
          <button
            key={topic.code}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(topic.code)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[0.8125rem] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-foreground bg-muted text-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40",
              disabled && "cursor-not-allowed opacity-40",
            )}
          >
            <span aria-hidden>{topic.emoji}</span>
            {topic.label}
          </button>
        );
      })}
    </div>
  );
}
