import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, MapPin, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PropertyCardData } from "@/components/property/property-card";
import { formatINR } from "@/lib/format";

/**
 * The one home the page argues for. Deliberately not a `PropertyCard`: running
 * the same card here as on /stays made "homes we're especially proud of" look
 * like a search result, which is the opposite of the claim being made.
 *
 * Composed as an overlap rather than two columns side by side. Every other
 * element on this page sits flat in the same centred column, so the section
 * that is supposed to read as the page's strongest statement was arriving with
 * exactly as much presence as the FAQ. Letting the panel climb onto the
 * photograph is the cheapest depth on the page and it costs no layout risk -
 * below `lg` the two simply stack.
 */
export function FeaturedStay({ property }: { property: PropertyCardData }) {
  return (
    <article className="relative">
      <Link
        href={`/stays/${property.slug}`}
        tabIndex={-1}
        aria-hidden
        className="group block overflow-hidden rounded-3xl"
      >
        {/* Wide and cinematic on desktop. The panel below covers the right
            third of it, so the crop is pushed left of centre to keep the
            subject of the photograph out from under the card. */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-muted sm:aspect-[16/10] lg:aspect-[21/9]">
          <Image
            src={property.heroImage}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 72rem"
            className="object-cover object-[38%_50%] transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
          />
          {/* Only enough of a scrim to seat the card. A full gradient here
              would dull a photograph that is doing the selling. */}
          <div
            aria-hidden
            className="absolute inset-0 hidden bg-[linear-gradient(105deg,transparent_45%,rgba(6,20,45,0.35)_100%)] lg:block"
          />
        </div>
      </Link>

      <div className="relative rounded-3xl border border-border bg-card p-6 shadow-lift-lg max-lg:mt-6 sm:p-8 lg:-mt-32 lg:ml-auto lg:w-[27rem] lg:-translate-x-8">
        <p className="label-eyebrow text-brand-azure">The one to book</p>

        <h3 className="mt-3">
          <Link
            href={`/stays/${property.slug}`}
            className="headline font-display text-[1.875rem] text-foreground transition-colors hover:text-brand-blue focus-visible:underline focus-visible:outline-none sm:text-[2.125rem]"
          >
            {property.name}
          </Link>
        </h3>

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {property.locationArea}, {property.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {property.maxGuests} guests
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="size-3.5" />
            {property.bedrooms}{" "}
            {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
          </span>
        </p>

        {property.amenityNames.length > 0 && (
          <p className="copy mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {property.amenityNames.slice(0, 4).join(" · ")}
          </p>
        )}

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="font-display text-[1.75rem] leading-none text-brand-azure tabular-nums">
              {formatINR(property.basePrice)}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">per night</p>
          </div>
          {property.rating !== null && (
            <p className="flex items-center gap-1.5 text-sm text-foreground">
              <Star className="size-4 fill-brand-gold text-brand-gold" />
              <span className="font-semibold tabular-nums">
                {property.rating.toFixed(1)}
              </span>
              <span className="text-muted-foreground tabular-nums">
                ({property.reviewCount})
              </span>
            </p>
          )}
        </div>

        <Button
          render={<Link href={`/stays/${property.slug}`} />}
          size="lg"
          className="mt-6 w-full"
        >
          See this home
          <ArrowRight />
        </Button>
      </div>
    </article>
  );
}
