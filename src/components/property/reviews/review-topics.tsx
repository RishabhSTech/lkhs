"use client";

import { cn } from "@/lib/utils";
import type { ReviewTopicCount } from "@/lib/property/review-topics";

/**
 * The emoji chip row between the rating breakdown and the reviews. Each chip
 * is a toggle: picking one narrows the list below to the reviews that mention
 * that topic, picking it again clears the filter.
 *
 * Rendered as a scrolling rail rather than a wrapping grid — the chips are a
 * single band in the design, and wrapping them to three rows on a phone turns
 * a glanceable summary into a wall.
 */
export function ReviewTopics({
  topics,
  selected,
  onSelect,
}: {
  topics: ReviewTopicCount[];
  selected: string | null;
  onSelect: (code: string | null) => void;
}) {
  if (topics.length === 0) return null;

  return (
    <div
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
      role="group"
      aria-label="Filter reviews by topic"
    >
      {topics.map((topic) => {
        const active = selected === topic.code;
        return (
          <button
            key={topic.code}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? null : topic.code)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              active
                ? "border-foreground bg-muted text-foreground"
                : "border-border text-foreground hover:border-foreground/40",
            )}
          >
            <span aria-hidden className="text-base leading-none">
              {topic.emoji}
            </span>
            {topic.label}
            <span className="tabular-nums text-muted-foreground">
              {topic.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
