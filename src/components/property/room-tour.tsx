"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TourImage = { id: string; url: string; alt: string | null };

/**
 * The featured home in real perspective, one room at a time.
 *
 * A listing thumbnail tells you a house exists; it does not tell you what it
 * would be like to be inside it, which is the actual thing being decided. This
 * lays the home's photographs out on an arc in 3D so the neighbouring rooms
 * stay visible at the edges of the frame - you can see there is more house
 * before you interact, which is what makes anyone interact.
 *
 * Built on CSS 3D rather than WebGL deliberately. The content is photographs
 * on flat planes, which `preserve-3d` projects with genuine perspective for no
 * bundle cost at all; a WebGL renderer would ship several hundred kilobytes to
 * this page to draw exactly the same quads. Every transform below is composited
 * on the GPU and nothing here re-renders on drag.
 */

/** How far each step rotates, recedes and slides. Tuned, not arbitrary:
 *  past ~36deg the near edge of a photograph foreshortens enough to look bent,
 *  and past ~200px of Z the neighbours shrink out of usefulness. */
const STEP_ROTATE = 34;
const STEP_DEPTH = 175;
const STEP_SHIFT = 54;
/** Slots further out than this are not rendered - they are invisible anyway. */
const VISIBLE = 2;

export function RoomTour({
  images,
  propertyName,
  propertySlug,
}: {
  images: TourImage[];
  propertyName: string;
  propertySlug: string;
}) {
  const [active, setActive] = useState(0);
  const dragX = useRef<number | null>(null);
  // A drag that begins on a side plane ends with a click on that same plane,
  // so the gesture would advance once and then jump again. This swallows the
  // click that a real drag leaves behind.
  const dragged = useRef(false);

  const go = useCallback(
    (delta: number) => {
      setActive((i) => Math.min(images.length - 1, Math.max(0, i + delta)));
    },
    [images.length],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  }

  // Pointer, not touch events: this handles mouse drag, trackpad and touch with
  // one code path, and it never fights the page's own vertical scrolling
  // because only the horizontal component is measured.
  function onPointerDown(event: React.PointerEvent) {
    dragX.current = event.clientX;
    dragged.current = false;
  }
  function onPointerUp(event: React.PointerEvent) {
    if (dragX.current === null) return;
    const delta = event.clientX - dragX.current;
    dragX.current = null;
    if (Math.abs(delta) > 44) {
      dragged.current = true;
      go(delta < 0 ? 1 : -1);
    }
  }

  if (images.length === 0) return null;

  return (
    <div className="relative">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photographs of ${propertyName}`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragX.current = null;
        }}
        className="relative h-[20rem] cursor-grab touch-pan-y overflow-hidden rounded-3xl bg-brand-blue-deep outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing sm:h-[26rem] lg:h-[32rem]"
        // `perspective` has to live on the ancestor of the transformed planes,
        // and the planes need their own 3D context or the browser flattens the
        // whole arc back into the page.
        style={{ perspective: "1400px", perspectiveOrigin: "50% 45%" }}
      >
        {/* A floor glow so the receding planes have something to sit against.
            Without it the arc reads as cut-out shapes rather than as depth. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_58%,rgba(37,99,235,0.28),transparent_70%)]"
        />

        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {images.map((image, i) => {
            const offset = i - active;
            const distance = Math.abs(offset);
            if (distance > VISIBLE) return null;

            const isActive = offset === 0;

            return (
              <button
                key={image.id}
                type="button"
                // The centre plane is inert - it is the thing you are already
                // looking at, so a click on it has nothing to do. It stays in
                // the accessibility tree, though: its image carries the alt
                // text for the room currently on screen, and `aria-hidden`
                // here would hide the one photograph that is being described.
                disabled={isActive}
                tabIndex={isActive ? -1 : 0}
                aria-label={
                  isActive
                    ? undefined
                    : `Show photograph ${i + 1} of ${images.length}`
                }
                onClick={() => {
                  if (dragged.current) return;
                  setActive(i);
                }}
                className={cn(
                  "absolute top-1/2 left-1/2 h-[70%] w-[76%] overflow-hidden rounded-2xl border border-white/10 outline-none transition-[transform,opacity] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-3 focus-visible:ring-white/60 sm:w-[62%] lg:w-[52%]",
                  isActive
                    ? "cursor-default shadow-[0_50px_90px_-40px_rgba(0,0,0,0.85)]"
                    : "cursor-pointer",
                  // Reduced motion keeps the arc - it is layout, not
                  // decoration - but removes the animated traversal.
                  "motion-reduce:transition-none",
                )}
                style={{
                  transform: `translate(-50%, -50%) translateX(${offset * STEP_SHIFT}%) translateZ(${-distance * STEP_DEPTH}px) rotateY(${-offset * STEP_ROTATE}deg)`,
                  opacity: distance === 0 ? 1 : distance === 1 ? 0.62 : 0.28,
                  zIndex: 10 - distance,
                }}
              >
                <Image
                  src={image.url}
                  alt={
                    isActive
                      ? (image.alt ?? `${propertyName}, photograph ${i + 1}`)
                      : ""
                  }
                  fill
                  sizes="(max-width: 640px) 76vw, (max-width: 1024px) 62vw, 36rem"
                  className="object-cover"
                  draggable={false}
                />
                {/* The off-centre planes are dimmed in the image itself as
                    well as by opacity, so the active room stays the brightest
                    thing in the frame at any screen brightness. */}
                {!isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-brand-blue-deep/45"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Controls sit above the 3D context, not inside it - a transformed
            ancestor would drag them onto the arc with everything else. */}
        <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-3 sm:inset-x-6 sm:bottom-6">
          <p
            aria-live="polite"
            className="rounded-full bg-brand-ink/55 px-3.5 py-1.5 text-[0.8125rem] font-medium text-white backdrop-blur-sm tabular-nums"
          >
            {active + 1} / {images.length}
          </p>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => go(-1)}
              disabled={active === 0}
              aria-label="Previous photograph"
              className="rounded-full bg-brand-ink/55 text-white backdrop-blur-sm hover:bg-brand-ink/75 hover:text-white"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => go(1)}
              disabled={active === images.length - 1}
              aria-label="Next photograph"
              className="rounded-full bg-brand-ink/55 text-white backdrop-blur-sm hover:bg-brand-ink/75 hover:text-white"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Drag, swipe or use the arrow keys to move through the house.
        </p>
        <Button
          render={<Link href={`/stays/${propertySlug}`} />}
          variant="outline"
          size="sm"
        >
          See the full home
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
