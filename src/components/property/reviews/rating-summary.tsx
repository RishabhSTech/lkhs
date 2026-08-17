import { Star } from "lucide-react";
import { DynamicIcon } from "@/components/property/dynamic-icon";
import { HowReviewsWork } from "@/components/property/reviews/how-reviews-work";
import { Laurel } from "@/components/property/reviews/laurel";
import type { ReviewSummary } from "@/lib/property/reviews";

/**
 * The block that opens the reviews section: the Guest favourite laurels and
 * headline average, then the overall-rating distribution alongside the six
 * category sub-scores.
 *
 * The category strip scrolls sideways on narrow screens rather than wrapping —
 * seven columns wrapped to two rows reads as a broken grid, and the whole point
 * of the strip is that it can be scanned in one pass.
 */
export function RatingSummary({
  summary,
  isGuestFavourite,
}: {
  summary: ReviewSummary;
  isGuestFavourite: boolean;
}) {
  if (summary.count === 0 || summary.average === null) return null;

  const scored = summary.categories.filter((c) => c.average !== null);
  // A flawless listing reads "5.0", not "5.00" — two decimals only earn their
  // place when there is something after the point to distinguish.
  const headline =
    summary.average === 5 ? "5.0" : summary.average.toFixed(2);

  return (
    <div>
      {isGuestFavourite ? (
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 items-center gap-1 text-foreground sm:h-24">
            <Laurel />
            <span className="font-heading text-6xl leading-none tabular-nums sm:text-7xl">
              {headline}
            </span>
            <Laurel flipped />
          </div>
          <p className="mt-3 font-heading text-xl text-foreground">
            Guest favourite
          </p>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            This home is a guest favourite based on ratings, reviews and
            reliability
          </p>
          <HowReviewsWork />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-baseline gap-2 font-heading text-3xl text-foreground">
            <Star className="size-6 translate-y-0.5 fill-brand-terracotta text-brand-terracotta" />
            {headline}
          </span>
          <span className="text-muted-foreground">
            · {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </span>
          <span className="w-full sm:w-auto">
            <HowReviewsWork />
          </span>
        </div>
      )}

      <div className="no-scrollbar mt-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max divide-x divide-border">
          <section className="pr-7 sm:pr-8">
            <h3 className="text-sm font-medium text-foreground">
              Overall rating
            </h3>
            <ul className="mt-2.5 w-40 space-y-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.distribution[stars - 1];
                const share = summary.count === 0 ? 0 : count / summary.count;
                return (
                  <li
                    key={stars}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="w-2 tabular-nums">{stars}</span>
                    <span
                      className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`${count} ${
                        count === 1 ? "review" : "reviews"
                      } at ${stars} ${stars === 1 ? "star" : "stars"}`}
                    >
                      <span
                        className="block h-full rounded-full bg-foreground"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {scored.map((category) => (
            <section
              key={category.key}
              className="flex w-[7.5rem] flex-col justify-between px-6 last:pr-0 sm:w-32"
            >
              <h3 className="text-sm font-medium text-foreground">
                {category.label}
              </h3>
              <p className="mt-2 font-heading text-xl tabular-nums text-foreground">
                {category.average!.toFixed(1)}
              </p>
              <DynamicIcon
                name={category.icon}
                className="mt-3 size-7 text-foreground"
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
