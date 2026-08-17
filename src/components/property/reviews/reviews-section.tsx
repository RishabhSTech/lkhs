import { CalendarX2 } from "lucide-react";
import { RatingSummary } from "@/components/property/reviews/rating-summary";
import { ReviewBrowser } from "@/components/property/reviews/review-browser";
import {
  WriteReview,
  type ReviewableStay,
} from "@/components/property/reviews/write-review";
import type { PublicReview } from "@/lib/property/review-display";
import type { ReviewTopicCount } from "@/lib/property/review-topics";
import type { ReviewSummary } from "@/lib/property/reviews";

export function ReviewsSection({
  summary,
  reviews,
  topics,
  isGuestFavourite,
  reviewableStay,
}: {
  summary: ReviewSummary;
  reviews: PublicReview[];
  topics: ReviewTopicCount[];
  isGuestFavourite: boolean;
  /** Set when the signed-in guest has a completed stay still to review. */
  reviewableStay?: ReviewableStay | null;
}) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarX2 className="size-4" />
          No reviews yet — this home is new to the collection.
        </p>
        {reviewableStay && <WriteReview stay={reviewableStay} />}
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
          reviewableStay ? (
            <WriteReview
              stay={reviewableStay}
              variant="outline"
              className="h-12 px-6 text-[0.9375rem]"
            />
          ) : null
        }
      />
    </div>
  );
}
