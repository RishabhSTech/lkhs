"use client";

import Image from "next/image";
import { useRef } from "react";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStayThread } from "@/components/preview/stay-thread";

/**
 * Beat two: where are you, though?
 *
 * The click that starts everything. Every beat below this one reads the
 * selection made here, so this is the only control on the page whose job is
 * narrative rather than navigational, and it is deliberately the plainest
 * thing in the layout: a strip of photographs, one of them lit.
 *
 * A radiogroup rather than a row of toggle buttons. This is a single-choice
 * control and the accessibility tree should say so, which also buys arrow-key
 * traversal that matches what the strip looks like it should do.
 */
export function CityStrip() {
  const { bundles, citySlug, selectCity } = useStayThread();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    // Wraps, because a strip that dead-ends at both edges makes a keyboard
    // user hunt for where the selection went.
    const next = (index + delta + bundles.length) % bundles.length;
    selectCity(bundles[next].city.slug);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Choose a city"
      className="rail px-5 sm:px-6"
    >
      {bundles.map((bundle, i) => {
        const selected = bundle.city.slug === citySlug;
        const { city } = bundle;
        return (
          <button
            key={city.slug}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: the group is one tab stop, and the arrow keys
            // move within it.
            tabIndex={selected ? 0 : -1}
            onClick={() => selectCity(city.slug)}
            onKeyDown={(event) => onKeyDown(event, i)}
            className={cn(
              "group relative w-[15rem] overflow-hidden rounded-xl text-left outline-none transition-all duration-300 focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-[17rem]",
              selected ? "ring-2 ring-brand-blue" : "ring-0",
            )}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
              {city.image && (
                <Image
                  src={city.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 60vw, 17rem"
                  className={cn(
                    "object-cover transition-all duration-500 ease-out group-hover:scale-[1.04]",
                    // The unselected cities step back rather than disappear.
                    // Greying them out entirely would read as disabled, which
                    // is the opposite of what the control is inviting.
                    selected
                      ? "saturate-100"
                      : "saturate-[0.55] group-hover:saturate-100",
                  )}
                />
              )}
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  selected
                    ? "bg-[linear-gradient(to_top,rgba(6,20,45,0.86)_0%,rgba(6,20,45,0.28)_46%,transparent_72%)]"
                    : "bg-[linear-gradient(to_top,rgba(6,20,45,0.72)_0%,rgba(6,20,45,0.34)_50%,rgba(6,20,45,0.18)_100%)]",
                )}
              />

              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-display-sm text-xl text-white">{city.name}</p>
                <p className="mt-0.5 text-[0.8125rem] text-white/70">
                  {city.propertyCount}{" "}
                  {city.propertyCount === 1 ? "home" : "homes"}
                  {city.minPrice !== null && (
                    <>
                      {", from "}
                      <span className="tabular-nums">
                        {formatINR(city.minPrice)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
