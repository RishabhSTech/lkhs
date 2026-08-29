import { CalendarX2 } from "lucide-react";
import { RatingSummary } from "@/components/property/reviews/rating-summary";
import { ReviewBrowser } from "@/components/property/reviews/review-browser";
import { ReviewPrompt } from "@/components/property/reviews/review-prompt";
import type { PublicReview } from "@/lib/property/review-display";
import type { ReviewTopicCount } from "@/lib/property/review-topics";
import type { ReviewSummary } from "@/lib/property/reviews";

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
          No reviews yet — this home is new to the collection.
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

  return (
    <div>
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
