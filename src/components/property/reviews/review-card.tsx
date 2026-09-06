"use client";

import { useState } from "react";
import { BadgeCheck, Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PublicReview } from "@/lib/property/review-display";
import {
  REVIEW_SOURCE_LABELS,
  TRIP_TYPE_LABELS,
  formatReviewMonth,
  formatStayLength,
  initialsOf,
} from "@/lib/property/reviews";

export function Stars({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span
      className={cn("flex gap-0.5", className)}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i < Math.round(rating)
              ? "fill-brand-gold text-brand-gold"
              : "fill-muted text-muted",
          )}
        />
      ))}
    </span>
  );
}

/**
 * "3 years on Lime Kraft" - how long the reviewer has been booking with us,
 * which is the line Airbnb prints under the name when it has no city to show.
 * Computed at render rather than stored, so it never goes stale.
 */
function tenureLabel(since: number | null) {
  if (!since) return null;
  const years = new Date().getUTCFullYear() - since;
  if (years < 1) return "New to Lime Kraft";
  return `${years} ${years === 1 ? "year" : "years"} on Lime Kraft`;
}

/**
 * One review, laid out the way Airbnb does it: who wrote it, then the meta
 * line (stars, month, stay length), then the body.
 *
 * `expandable` is off inside the "all reviews" dialog, where there is room to
 * print every review in full and a per-card toggle would only add noise.
 */
export function ReviewCard({
  review,
  expandable = true,
}: {
  review: PublicReview;
  expandable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const stayLength = formatStayLength(review.nights);

  // Roughly four clamped lines. Below that the toggle costs more attention
  // than the hidden text is worth.
  const isLong = review.body.length > 260;
  const clamped = expandable && isLong && !expanded;

  return (
    <article className="min-w-0">
      <header className="flex items-center gap-3">
        <Avatar size="lg">
          {review.avatarUrl && (
            <AvatarImage src={review.avatarUrl} alt="" />
          )}
          <AvatarFallback>{initialsOf(review.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{review.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {review.location ??
              tenureLabel(review.since) ??
              REVIEW_SOURCE_LABELS[review.source]}
          </p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <Stars rating={review.rating} />
        <span aria-hidden>·</span>
        <span>{formatReviewMonth(review.stayedOn)}</span>
        {stayLength && (
          <>
            <span aria-hidden>·</span>
            <span>{stayLength}</span>
          </>
        )}
        {review.tripType && (
          <>
            <span aria-hidden>·</span>
            <span>{TRIP_TYPE_LABELS[review.tripType]}</span>
          </>
        )}
        {review.isVerifiedStay && (
          <span className="inline-flex items-center gap-1 text-brand-mist">
            <BadgeCheck className="size-3.5" />
            Verified stay
          </span>
        )}
      </div>

      {review.title && (
        <p className="mt-3 font-heading text-lg text-foreground">
          {review.title}
        </p>
      )}

      <p
        className={cn(
          "mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line text-foreground",
          clamped && "line-clamp-4",
        )}
      >
        {review.body}
      </p>

      {expandable && isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-brand-azure"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {review.response && (
        <div className="mt-4 border-l-2 border-border pl-4">
          <p className="text-xs font-medium text-foreground">
            Response from Lime Kraft
          </p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {review.response}
          </p>
        </div>
      )}
    </article>
  );
}
