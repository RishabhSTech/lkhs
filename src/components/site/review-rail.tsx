"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spotlight } from "@/components/site/spotlight";

export type RailReview = {
  id: string;
  title: string | null;
  body: string;
  rating: number;
  author: string;
  propertyName: string;
  propertySlug: string;
};

/**
 * Reviews as a draggable rail rather than a three-up grid.
 *
 * A grid caps the section at whatever fits one row, which quietly tells the
 * visitor that three is all there is. A rail carries every review worth showing
 * at full size and reads as "there is more here" — and it is built on the same
 * native scroll-snap the category rail uses, so it drags, flicks, scrolls with
 * a trackpad and tabs through without a carousel library or a single pixel of
 * transform maths.
 */
export function ReviewRail({ reviews }: { reviews: RailReview[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    setAtStart(node.scrollLeft <= 4);
    // A one-pixel slack: sub-pixel widths mean the sum rarely lands exactly.
    setAtEnd(node.scrollLeft + node.clientWidth >= node.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const node = trackRef.current;
    if (!node) return;
    // The track's own width changes with the viewport, and a rail that fits
    // entirely on screen must not show two dead arrows.
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, [sync]);

  function step(direction: 1 | -1) {
    const node = trackRef.current;
    if (!node) return;
    const card = node.firstElementChild as HTMLElement | null;
    const distance = card ? card.offsetWidth + 16 : node.clientWidth * 0.8;
    node.scrollBy({ left: distance * direction, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="mx-auto mb-5 flex w-full max-w-6xl justify-end gap-2 px-5 sm:px-6">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => step(-1)}
          disabled={atStart}
          aria-label="Previous reviews"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => step(1)}
          disabled={atEnd}
          aria-label="More reviews"
        >
          <ChevronRight />
        </Button>
      </div>

      <div
        ref={trackRef}
        onScroll={sync}
        // The gutter tracks the 72rem container rather than the viewport, so
        // the first card starts under the section heading while the track
        // itself still runs off the edge of the screen.
        className="rail no-scrollbar gap-4 px-[max(1.25rem,calc((100%-72rem)/2))] sm:px-[max(1.5rem,calc((100%-72rem)/2))]"
      >
        {reviews.map((review) => (
          <Spotlight
            key={review.id}
            className="flex w-[19rem] flex-col rounded-2xl border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-[0_18px_50px_-24px_rgba(11,47,107,0.35)] sm:w-[22rem]"
          >
            <figure className="relative z-[2] flex h-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <Quote className="size-4 text-brand-azure" />
                <span
                  className="flex gap-0.5"
                  aria-label={`${review.rating} out of 5`}
                >
                  {Array.from({ length: review.rating }).map((_, star) => (
                    <Star
                      key={star}
                      className="size-3 fill-brand-gold text-brand-gold"
                    />
                  ))}
                </span>
              </div>

              <blockquote className="mt-4 flex-1">
                {review.title && (
                  <span className="block font-display-sm text-xl text-foreground">
                    {review.title}
                  </span>
                )}
                <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </span>
              </blockquote>

              <figcaption className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {review.author}
                </span>
                {" · "}
                <Link
                  href={`/stays/${review.propertySlug}`}
                  className="transition-colors hover:text-brand-azure hover:underline"
                >
                  {review.propertyName}
                </Link>
              </figcaption>
            </figure>
          </Spotlight>
        ))}
        {/* Trailing spacer so the last card clears the gutter when scrolled. */}
        <div aria-hidden className="w-1" />
      </div>
    </div>
  );
}
