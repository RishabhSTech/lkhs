import { Star } from "lucide-react";
import { CountUp, type CountUpFormat } from "@/components/site/count-up";

/**
 * The credibility numbers, directly under the hero.
 *
 * Deliberately the first thing below the fold, and deliberately nothing but
 * figures: someone who has never heard of us decides whether we are real
 * before they decide whether any particular home is nice. The reassurances
 * that used to sit here as a second row were saying the same four things as
 * the hero and the direct-booking section — three statements of one argument
 * is not three times the trust, it is a page that protests too much.
 *
 * Every figure is read off the database. Nothing here is a marketing claim —
 * the moment one of them is, the others stop working.
 *
 * Set as a ruled figure line rather than four equal boxes. Four equal columns
 * is what a statistics widget looks like, and a statistics widget is exactly
 * the thing a visitor has learned to skip. Hanging the figures off a single
 * hairline, against a line that says where they come from, makes them read as
 * a masthead — which is the register this band is actually in.
 */
export function ProofBar({
  homes,
  cities,
  rating,
  reviews,
  fromPrice,
}: {
  homes: number;
  /** Number of cities we operate in, so this line never says "Indore" again. */
  cities: number;
  rating: number | null;
  reviews: number;
  fromPrice: number | null;
}) {
  const stats: {
    key: string;
    value: number;
    format?: CountUpFormat;
    label: string;
    star?: boolean;
  }[] = [
    {
      key: "homes",
      value: homes,
      label: homes === 1 ? "home, run by us" : "homes, all run by us",
    },
  ];

  // A "1" here would be padding, not proof. The stat earns its place from the
  // second city onwards.
  if (cities > 1) {
    stats.push({
      key: "cities",
      value: cities,
      label: "cities, known properly",
    });
  }
  if (rating !== null && reviews > 0) {
    stats.push({
      key: "rating",
      value: rating,
      format: "rating",
      label: `from ${reviews} guest ${reviews === 1 ? "review" : "reviews"}`,
      star: true,
    });
  }
  if (fromPrice !== null) {
    stats.push({
      key: "from",
      // The animation runs on the number; the currency shaping is applied to
      // each frame rather than to the endpoint.
      value: fromPrice,
      format: "inr",
      label: "lowest nightly rate",
    });
  }

  return (
    <section
      aria-label="Lime Kraft in numbers"
      className="border-b border-border bg-brand-ivory"
    >
      <div className="mx-auto w-full max-w-6xl px-5 pt-11 pb-12 sm:px-6 lg:pt-14 lg:pb-16">
        <div className="grid gap-y-9 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,2fr)] lg:items-start lg:gap-x-14">
          {/* Provenance, not a fourth reassurance. The three claims in the
              hero are about what we do; this one is about where the numbers
              underneath it come from, which is the only thing that makes a
              figure worth printing. */}
          <p className="copy max-w-xs text-[0.9375rem] leading-relaxed text-muted-foreground">
            Every figure here is read straight off our own booking system, the
            morning you load the page.
          </p>

          {/* Hairline-divided, hung from a shared rule: two columns on
              small screens, a flex row on wide ones.

              Deliberately not `repeat(auto-fit, minmax(0, 1fr))` — a zero
              minimum means an unbounded number of tracks fit, so auto-fit
              collapses the whole row to one column. `flex-1` divides the row
              correctly for the two, three or four figures the inventory can
              honestly support, with no track count to keep in sync. */}
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8 border-t border-brand-mist/35 pt-7 sm:gap-x-10 lg:flex lg:gap-x-0">
            {stats.map((stat, i) => (
              <div
                key={stat.key}
                className={
                  // Vertical rules between figures on wide screens only; at
                  // two columns they would fall in the middle of the grid and
                  // read as a table.
                  i === 0
                    ? "lg:flex-1 lg:pr-8"
                    : "lg:flex-1 lg:border-l lg:border-brand-mist/35 lg:pr-8 lg:pl-8"
                }
              >
                <dd className="flex items-start gap-1.5 font-display text-[clamp(2.25rem,4.2vw,3.25rem)] leading-none text-brand-blue tabular-nums">
                  {stat.star && (
                    <Star
                      aria-hidden
                      className="mt-1 size-4 shrink-0 fill-brand-gold text-brand-gold sm:size-[1.125rem]"
                    />
                  )}
                  <CountUp value={stat.value} format={stat.format} />
                </dd>
                <dt className="mt-3 max-w-[15ch] text-[0.8125rem] leading-snug text-muted-foreground">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
