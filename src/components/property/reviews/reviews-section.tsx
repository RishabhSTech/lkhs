import { CalendarX2 } from "lucide-react";
import { RatingSummary } from "@/components/property/reviews/rating-summary";
import { ReviewBrowser } from "@/components/property/reviews/review-browser";
import { ReviewPrompt } from "@/components/property/reviews/review-prompt";
import { SourceBadge } from "@/components/property/reviews/source-badge";
import type { PublicReview } from "@/lib/property/review-display";
import type { ReviewTopicCount } from "@/lib/property/review-topics";
import type { ReviewSummary } from "@/lib/property/reviews";
import type { ReviewSource } from "@prisma/client";

/**
 * Every site reviews were pulled in from, most-reviewed first - a strip of
 * brand-gradient badges above the breakdown, so the section reads at a
 * glance as a collage gathered from everywhere guests actually write, not
 * just from this site.
 */
function sourcesCollage(reviews: PublicReview[]) {
  const counts = new Map<ReviewSource, number>();
  for (const review of reviews) {
    counts.set(review.source, (counts.get(review.source) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function ReviewsSection({
  summary,
  reviews,
  topics,
  isGuestFavourite,
  propertyId,
}: {
  summary: ReviewSummary;
  reviews: PublicReview[];
  topics: ReviewTopicCount[];
  isGuestFavourite: boolean;
  /** Used to ask, after hydration, whether this visitor may leave a review. */
  propertyId: string;
}) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarX2 className="size-4" />
          No reviews yet - this home is new to the collection.
        </p>
        <ReviewPrompt propertyId={propertyId} />
      </div>
    );
  }

  // Rendered once here and handed to the browser as a node, so the dialog can
  // reuse the identical breakdown without it becoming client code.
  const breakdown = (
    <RatingSummary summary={summary} isGuestFavourite={isGuestFavourite} />
  );
  const sources = sourcesCollage(reviews);

  return (
    <div>
      {sources.length > 1 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Loved across
          </span>
          {sources.map(([source, count]) => (
            <SourceBadge key={source} source={source} className="gap-1">
              {count > 1 && (
                <span className="text-muted-foreground">· {count}</span>
              )}
            </SourceBadge>
          ))}
        </div>
      )}

      {breakdown}

      <ReviewBrowser
        reviews={reviews}
        topics={topics}
        summary={breakdown}
        action={
          <ReviewPrompt
            propertyId={propertyId}
            variant="outline"
            className="h-12 px-6 text-[0.9375rem]"
          />
        }
      />
    </div>
  );
}
