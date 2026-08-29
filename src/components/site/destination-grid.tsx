import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Spotlight } from "@/components/site/spotlight";
import type { CityRecord } from "@/lib/queries/locations";
import type { UpcomingCity } from "@/lib/seo/upcoming";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Cities, weighted by inventory rather than laid out in equal thirds.
 *
 * Two things were wrong with the equal-thirds version. Structurally, three
 * identical tiles say the three cities are interchangeable, which is the
 * opposite of what the numbers underneath them say. Visually, it ran the same
 * dark-gradient-plus-bottom-left-label treatment as the category rail two
 * sections above, so at a glance the page appeared to show the same component
 * twice. The lead city now takes a tall portrait tile and the rest sit beside
 * it, and the caption is a frosted plate rather than a gradient — the
 * photograph keeps its own contrast and the two sections stop rhyming.
 */
export function DestinationGrid({
  cities,
  upcoming = [],
}: {
  cities: CityRecord[];
  /**
   * Cities we have announced but cannot yet sell. They sit in the stack
   * beside the open ones, marked as such and never priced — a city with no
   * bookable homes must not be able to borrow the shape of one that has them.
   */
  upcoming?: UpcomingCity[];
}) {
  if (cities.length === 0) return null;

  // A single city has nothing to be asymmetric against; it gets one wide tile
  // rather than a lead-plus-nothing layout with a hole in it.
  const [lead, ...rest] = cities;
  // An announcement counts towards the stack: one open city plus one opening
  // is still two tiles, and the lead should run tall against them.
  const solo = rest.length === 0 && upcoming.length === 0;

  // The stack holds three. Open cities have first claim on those slots — an
  // announcement never displaces a city you can actually book tonight.
  const stack = rest.slice(0, 3);
  const announcements = upcoming.slice(0, Math.max(0, 3 - stack.length));

  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-5",
        !solo && "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]",
      )}
    >
      <CityTile
        city={lead}
        // The lead runs tall against the stack beside it. On its own it runs
        // wide, because a lone portrait tile in a 72rem column looks like a
        // layout that failed to load.
        className={
          solo ? "aspect-[16/9]" : "aspect-[4/5] lg:aspect-auto lg:min-h-[34rem]"
        }
        size="lead"
      />

      {!solo && (
        // `auto-rows-fr` rather than a fixed row count: the stack carries
        // one, two or three cities depending on the portfolio, and equal
        // fractional rows divide the lead tile's height correctly for any of
        // them. A fixed `grid-rows-3` would leave a hole at two.
        <div className="grid gap-4 sm:gap-5 lg:auto-rows-fr">
          {stack.map((city) => (
            <CityTile
              key={city.slug}
              city={city}
              className="aspect-[16/10] sm:aspect-[2/1] lg:aspect-auto"
            />
          ))}
          {announcements.map((city) => (
            <UpcomingTile
              key={city.slug}
              city={city}
              className="aspect-[16/10] sm:aspect-[2/1] lg:aspect-auto"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CityTile({
  city,
  className,
  size = "rest",
}: {
  city: CityRecord;
  className?: string;
  size?: "lead" | "rest";
}) {
  const lead = size === "lead";

  return (
    <Spotlight className="h-full rounded-2xl">
      <Link
        href={`/stays-in-${city.slug}`}
        className="group block h-full overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-2xl bg-muted",
            className,
          )}
        >
          {city.image && (
            <Image
              src={city.image}
              alt=""
              fill
              sizes={
                lead
                  ? "(max-width: 1024px) 100vw, 38rem"
                  : "(max-width: 1024px) 100vw, 34rem"
              }
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
          )}

          {/* A frosted plate, seated on the bottom edge. It carries its own
              contrast, so the photograph above it is never dimmed to make the
              type work — which is what the old full-height gradient was doing
              to every city image on the page. */}
          <div className="plate absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <h3
                className={cn(
                  "font-display text-white",
                  lead ? "text-[1.75rem] sm:text-[2rem]" : "text-2xl",
                )}
              >
                {city.name}
              </h3>
              <p className="mt-1 truncate text-[0.8125rem] leading-snug text-white/70 tabular-nums">
                {city.propertyCount}{" "}
                {city.propertyCount === 1 ? "home" : "homes"}
                {city.minPrice !== null &&
                  ` · from ${formatINR(city.minPrice)} a night`}
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-white transition-[transform,background-color] duration-300 group-hover:-translate-y-0.5 group-hover:bg-white/20 group-focus-visible:-translate-y-0.5"
            >
              <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </Spotlight>
  );
}

/**
 * A city we are opening, not one you can book.
 *
 * Everything that makes `CityTile` a sales unit is deliberately absent: no
 * home count, no nightly rate, no link into a search that would come back
 * empty. What it keeps is the photograph and the shape, so the row still reads
 * as one map of where we are rather than as a card and an apology.
 *
 * The photograph is desaturated and the plate carries a gold rule. Both say
 * "not yet" before a word is read, which is the only way a caption like this
 * survives being skimmed.
 */
function UpcomingTile({
  city,
  className,
}: {
  city: UpcomingCity;
  className?: string;
}) {
  return (
    <Spotlight className="h-full rounded-2xl">
      <Link
        // Not a stays URL — there is nothing to list. The one useful thing
        // someone can do about a city that has not opened is tell us their
        // dates, so that is where this goes.
        href="/contact"
        className="group block h-full overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-2xl bg-muted",
            className,
          )}
        >
          <Image
            src={city.image}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 34rem"
            className="object-cover saturate-[0.6] transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.05] group-hover:saturate-100"
          />

          {/* Top-left, away from the plate: the status has to land before the
              name does, or the tile reads as a fourth bookable city. */}
          <span className="absolute top-4 left-4 rounded-full bg-brand-gold px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.12em] text-brand-blue uppercase">
            Opening soon
          </span>

          <div className="plate absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 border-t border-brand-gold/45 px-5 py-4">
            <div className="min-w-0">
              <h3 className="font-display text-2xl text-white">{city.name}</h3>
              <p className="mt-1 truncate text-[0.8125rem] leading-snug text-white/70">
                {city.areas.join(" · ")}
              </p>
            </div>
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/12 text-white transition-[transform,background-color] duration-300 group-hover:-translate-y-0.5 group-hover:bg-white/20 group-focus-visible:-translate-y-0.5"
            >
              <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </Spotlight>
  );
}
