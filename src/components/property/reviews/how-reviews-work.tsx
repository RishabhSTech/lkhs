"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The "How reviews work" link under the Guest favourite badge. Worth being
 * concrete here rather than reassuring: guests are reading it precisely
 * because they want to know whether the number can be gamed.
 */
export function HowReviewsWork() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 text-sm font-medium text-foreground underline underline-offset-4 transition-colors hover:text-brand-azure"
      >
        How reviews work
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85svh] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-6 pt-6 pb-4">
            <DialogTitle className="font-heading text-xl">
              How reviews work
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6 text-sm leading-relaxed text-muted-foreground">
            <Item title="Only guests who stayed can review">
              A review can only be written against a completed booking, once
              the guest has checked out. Reviews carrying the “Verified stay”
              mark are attached to a booking in our own system.
            </Item>
            <Item title="The stay length isn’t self-reported">
              Where a review is attached to one of our bookings, the number of
              nights comes from the booking itself. It can’t be typed in.
            </Item>
            <Item title="Ratings are an average, not a selection">
              The headline figure is the mean of every published review, and
              the bars show the full spread from five stars down to one. The
              six category scores are averaged over the guests who answered
              that category.
            </Item>
            <Item title="We reply, we don’t edit">
              We can reply to a review publicly and we can hide one that breaks
              our content rules, with a record kept either way. We can’t edit
              what a guest wrote or delete a review because it’s unflattering.
            </Item>
            <Item title="Reviews from other channels are labelled">
              Some reviews are carried over from Airbnb, Booking.com and
              others. They show the channel they came from and never claim to
              be a verified stay.
            </Item>
            <Item title="Guest favourite">
              The badge goes to homes rated 4.7 or better across at least three
              reviews. It’s withdrawn automatically if the scores drop.
            </Item>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Item({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-[0.9375rem] font-medium text-foreground">{title}</h3>
      <p className="mt-1">{children}</p>
    </section>
  );
}
