import { Star } from "lucide-react";
import { formatINR } from "@/lib/format";

/**
 * The credibility numbers, one line, no section heading. These used to be
 * crammed under the hero headline where they competed with it; on their own
 * band they read as fact rather than decoration.
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
  // Every figure here is read off the database. Nothing on this band is a
  // marketing claim — the moment one of them is, the other three stop working.
  const items: { value: string; label: string; star?: boolean }[] = [
    {
      value: String(homes),
      label:
        cities > 1
          ? `homes across ${cities} cities`
          : homes === 1
            ? "home, run by us"
            : "homes, all run by us",
    },
  ];

  if (rating !== null && reviews > 0) {
    items.push({
      value: rating.toFixed(1),
      label: `from ${reviews} guest reviews`,
      star: true,
    });
  }
  if (fromPrice !== null) {
    items.push({ value: formatINR(fromPrice), label: "lowest nightly rate" });
  }

  return (
    <div className="border-y border-border bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-6 px-5 py-8 sm:grid-cols-3 sm:gap-y-0 sm:px-6 sm:divide-x sm:divide-border">
        {items.map((item) => (
          <div key={item.label} className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
            <p className="flex items-center gap-1.5 font-display text-[1.75rem] text-foreground">
              {item.star && (
                <Star className="size-4 fill-brand-terracotta text-brand-terracotta" />
              )}
              {item.value}
            </p>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
