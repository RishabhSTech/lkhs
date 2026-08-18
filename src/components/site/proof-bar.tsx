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
      className="border-b border-border bg-gradient-to-b from-brand-ivory to-background"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-9 px-5 py-12 sm:px-6 lg:grid-cols-4 lg:gap-x-10 lg:py-14">
        {stats.map((stat) => (
          <div key={stat.key}>
            <p className="flex items-baseline gap-1.5 font-display text-[2.25rem] text-brand-blue tabular-nums sm:text-[2.75rem]">
              {stat.star && (
                <Star className="size-4 translate-y-[-0.4rem] fill-brand-gold text-brand-gold sm:size-5" />
              )}
              <CountUp value={stat.value} format={stat.format} />
            </p>
            <p className="mt-2 max-w-[16ch] text-sm leading-snug text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
