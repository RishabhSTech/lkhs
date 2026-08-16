"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { BedDouble, Heart, MapPin, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PropertyCardData = {
  slug: string;
  name: string;
  locationArea: string;
  city: string;
  heroImage: string;
  basePrice: number;
  maxGuests: number;
  bedrooms: number;
  rating: number | null;
  reviewCount: number;
  amenityNames: string[];
  isSaved?: boolean;
};

export function PropertyCard({
  property,
  priority = false,
  onToggleSave,
}: {
  property: PropertyCardData;
  priority?: boolean;
  onToggleSave?: (slug: string, next: boolean) => Promise<void> | void;
}) {
  const [saved, setSaved] = useState(property.isSaved ?? false);
  const [, startTransition] = useTransition();

  function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    const next = !saved;
    setSaved(next); // optimistic; reverted below if the write fails
    startTransition(async () => {
      try {
        if (onToggleSave) {
          await onToggleSave(property.slug, next);
          return;
        }
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertySlug: property.slug, saved: next }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not save.");
        }
      } catch (err) {
        setSaved(!next);
        toast.error(
          err instanceof Error ? err.message : "Could not save that stay.",
        );
      }
    });
  }

  return (
    <Link
      href={`/stays/${property.slug}`}
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <article>
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          <Image
            src={property.heroImage}
            alt={property.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <button
            type="button"
            onClick={toggleSave}
            aria-label={saved ? "Remove from saved" : "Save this stay"}
            aria-pressed={saved}
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/85 backdrop-blur-sm transition-all hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Heart
              className={cn(
                "size-4 transition-all duration-200",
                saved
                  ? "scale-110 fill-brand-terracotta text-brand-terracotta"
                  : "text-brand-ink/70",
              )}
            />
          </button>
        </div>

        <div className="pt-3.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading text-lg leading-snug text-brand-green">
              {property.name}
            </h3>
            {property.rating !== null && (
              <span className="mt-0.5 flex shrink-0 items-center gap-1 text-sm text-brand-ink">
                <Star className="size-3.5 fill-brand-terracotta text-brand-terracotta" />
                <span className="font-medium">{property.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({property.reviewCount})
                </span>
              </span>
            )}
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            {property.locationArea}, {property.city}
          </p>

          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              {property.maxGuests} guests
            </span>
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-3.5" />
              {property.bedrooms} {property.bedrooms === 1 ? "bedroom" : "bedrooms"}
            </span>
          </p>

          {property.amenityNames.length > 0 && (
            <p className="mt-2 truncate text-xs text-muted-foreground/80">
              {property.amenityNames.slice(0, 4).join(" · ")}
            </p>
          )}

          <p className="mt-3 text-sm text-brand-ink">
            <span className="font-heading text-xl text-brand-green">
              {formatINR(property.basePrice)}
            </span>
            <span className="text-muted-foreground"> / night</span>
          </p>
        </div>
      </article>
    </Link>
  );
}
