"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BookingCard } from "@/components/property/booking-card";
import { formatINR } from "@/lib/format";

export function MobileBookingBar(props: {
  propertyId: string;
  propertySlug: string;
  basePrice: number;
  maxGuests: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-muted/40/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-heading text-xl leading-none text-foreground">
            {formatINR(props.basePrice)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">per night</p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button size="lg">Check availability</Button>} />
          <SheetContent side="bottom" className="max-h-[92svh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-heading text-2xl text-foreground">
                Your stay
              </SheetTitle>
              <SheetDescription>
                Pick your dates to see the full price breakdown.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <BookingCard {...props} className="border-0 p-0 shadow-none" />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
