"use client";

import { useMemo, useState } from "react";
import type { AmenityCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DynamicIcon } from "@/components/property/dynamic-icon";
import {
  AMENITY_CATEGORY_LABELS,
  AMENITY_CATEGORY_ORDER,
  AMENITY_PREVIEW_PRIORITY,
} from "@/lib/property/amenities";

export type OfferedAmenity = {
  id: string;
  name: string;
  icon: string;
  category: AmenityCategory;
  isUnavailable: boolean;
  note: string | null;
};

/** How many rows the collapsed section shows before the dialog takes over. */
const PREVIEW_COUNT = 10;

export function PlaceOffers({ amenities }: { amenities: OfferedAmenity[] }) {
  const [open, setOpen] = useState(false);

  const { available, unavailable, preview, grouped } = useMemo(() => {
    const available = amenities.filter((a) => !a.isUnavailable);
    const unavailable = amenities.filter((a) => a.isUnavailable);

    // The collapsed preview leads with the amenities guests actually scan for,
    // then fills the remaining slots in catalogue order.
    const rank = new Map(
      AMENITY_PREVIEW_PRIORITY.map((name, index) => [name, index]),
    );
    const preview = [...available]
      .sort(
        (a, b) =>
          (rank.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(b.name) ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, PREVIEW_COUNT);

    const grouped = AMENITY_CATEGORY_ORDER.map((category) => ({
      category,
      label: AMENITY_CATEGORY_LABELS[category],
      items: available.filter((a) => a.category === category),
    })).filter((group) => group.items.length > 0);

    return { available, unavailable, preview, grouped };
  }, [amenities]);

  if (amenities.length === 0) return null;

  return (
    <div>
      <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
        {preview.map((amenity) => (
          <AmenityRow key={amenity.id} amenity={amenity} />
        ))}
      </ul>

      {/* "Not included" normally lives in the dialog. On a short listing there
          is no dialog, so it is shown inline rather than lost. */}
      {unavailable.length > 0 && available.length <= PREVIEW_COUNT && (
        <div className="mt-7">
          <h3 className="font-heading text-lg text-foreground">Not included</h3>
          <ul className="mt-3 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {unavailable.map((amenity) => (
              <li
                key={amenity.id}
                className="flex items-start gap-3.5 text-[0.9375rem] text-muted-foreground line-through"
              >
                <DynamicIcon name={amenity.icon} className="mt-0.5" />
                <span>{amenity.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {available.length > PREVIEW_COUNT && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button variant="outline" size="lg" className="mt-7">
                Show all {available.length} amenities
              </Button>
            }
          />
          <DialogContent className="max-h-[85svh] max-w-2xl gap-0 overflow-y-auto p-0 sm:max-w-2xl">
            <DialogHeader className="sticky top-0 z-10 border-b border-border bg-popover px-6 pt-6 pb-4">
              <DialogTitle className="font-heading text-xl">
                What this place offers
              </DialogTitle>
            </DialogHeader>

            <div className="px-6 pb-6">
              {grouped.map((group) => (
                <section key={group.category} className="pt-6">
                  <h3 className="font-heading text-lg text-foreground">
                    {group.label}
                  </h3>
                  <ul className="mt-2">
                    {group.items.map((amenity) => (
                      <li
                        key={amenity.id}
                        className="flex items-start gap-4 border-b border-border py-4 last:border-0"
                      >
                        <DynamicIcon
                          name={amenity.icon}
                          className="mt-0.5 text-foreground"
                        />
                        <span className="text-[0.9375rem] text-foreground">
                          {amenity.name}
                          {amenity.note && (
                            <span className="mt-0.5 block text-sm text-muted-foreground">
                              {amenity.note}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              {unavailable.length > 0 && (
                <section className="pt-6">
                  <h3 className="font-heading text-lg text-foreground">
                    Not included
                  </h3>
                  <ul className="mt-2">
                    {unavailable.map((amenity) => (
                      <li
                        key={amenity.id}
                        className="flex items-start gap-4 border-b border-border py-4 text-muted-foreground line-through last:border-0"
                      >
                        <DynamicIcon
                          name={amenity.icon}
                          className="mt-0.5 no-underline"
                        />
                        <span className="text-[0.9375rem]">{amenity.name}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AmenityRow({ amenity }: { amenity: OfferedAmenity }) {
  return (
    <li className="flex items-start gap-3.5 text-[0.9375rem] text-foreground">
      <DynamicIcon name={amenity.icon} className="mt-0.5 text-foreground" />
      <span>
        {amenity.name}
        {amenity.note && (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {amenity.note}
          </span>
        )}
      </span>
    </li>
  );
}
