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
 */
export function FeaturedStay({ property }: { property: PropertyCardData }) {
  return (
    <article className="grid items-center gap-7 lg:grid-cols-[1.3fr_0.7fr] lg:gap-12">
      <Link
        href={`/stays/${property.slug}`}
        tabIndex={-1}
        aria-hidden
        className="group block overflow-hidden rounded-2xl"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted lg:aspect-[16/11]">
          <Image
            src={property.heroImage}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 62vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </div>
      </Link>

      <div>
        <p className="label-eyebrow text-brand-terracotta">The one to book</p>

        <h3 className="mt-3">
          <Link
            href={`/stays/${property.slug}`}
            className="font-display text-[1.875rem] text-foreground transition-colors hover:text-brand-green sm:text-[2.25rem] focus-visible:outline-none focus-visible:underline"
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
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {property.amenityNames.slice(0, 5).join(" · ")}
          </p>
        )}

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="font-display text-[1.75rem] text-brand-terracotta">
              {formatINR(property.basePrice)}
            </p>
            <p className="text-sm text-muted-foreground">per night</p>
          </div>
          {property.rating !== null && (
            <p className="flex items-center gap-1.5 text-sm text-foreground">
              <Star className="size-4 fill-brand-terracotta text-brand-terracotta" />
              <span className="font-semibold">{property.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({property.reviewCount})
              </span>
            </p>
          )}
        </div>

        <Button
          render={<Link href={`/stays/${property.slug}`} />}
          size="lg"
          className="mt-6 w-full sm:w-auto"
        >
          See this home
          <ArrowRight />
        </Button>
      </div>
    </article>
  );
}
