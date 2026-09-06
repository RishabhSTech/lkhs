"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";

/**
 * The mark-up we are modelling. The channels take fourteen to sixteen percent
 * between host commission and the guest-side service fee, so the midpoint is
 * what this uses - and the panel says so on screen. A savings widget that
 * cannot show its working is worth less than no widget at all.
 */
const CHANNEL_MARKUP = 0.15;

const MIN_NIGHTS = 2;
const MAX_NIGHTS = 14;

/**
 * "Book direct and you keep the difference" is the single most important claim
 * on this page, and as a sentence it is completely inert - every operator says
 * it. Letting someone drag a slider and watch the number move turns the claim
 * into something they worked out themselves, against a real home at its real
 * nightly rate.
 */
export function DirectSavings({
  property,
}: {
  property: { name: string; slug: string; basePrice: number };
}) {
  const id = useId();
  const [nights, setNights] = useState(4);

  const direct = property.basePrice * nights;
  const viaChannel = Math.round(direct * (1 + CHANNEL_MARKUP));
  const saved = viaChannel - direct;
  const progress = (nights - MIN_NIGHTS) / (MAX_NIGHTS - MIN_NIGHTS);

  return (
    <div className="rounded-3xl border border-white/12 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[0.9375rem] font-medium text-white">
          {property.name}
        </p>
        <p className="text-sm text-white/55 tabular-nums">
          {formatINR(property.basePrice)} / night
        </p>
      </div>

      <div className="mt-7">
        <label
          htmlFor={id}
          className="flex items-baseline justify-between gap-4 text-sm text-white/70"
        >
          How many nights?
          <span className="font-display text-2xl text-white tabular-nums">
            {nights}
          </span>
        </label>
        <input
          id={id}
          type="range"
          min={MIN_NIGHTS}
          max={MAX_NIGHTS}
          step={1}
          value={nights}
          onChange={(event) => setNights(Number(event.target.value))}
          aria-valuetext={`${nights} nights`}
          // The filled portion is painted with a gradient driven by the value
          // rather than an overlay element, so the track cannot drift out of
          // sync with the thumb on any browser.
          style={{
            background: `linear-gradient(to right, var(--color-brand-gold) 0%, var(--color-brand-gold) ${progress * 100}%, rgba(255,255,255,0.18) ${progress * 100}%, rgba(255,255,255,0.18) 100%)`,
          }}
          className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-3 focus-visible:ring-white/40 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
        />
        <div
          aria-hidden
          className="mt-2 flex justify-between text-xs text-white/40 tabular-nums"
        >
          <span>{MIN_NIGHTS} nights</span>
          <span>{MAX_NIGHTS} nights</span>
        </div>
      </div>

      <dl className="mt-8 space-y-3 border-t border-white/12 pt-6 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-white/55">On a travel site, around</dt>
          <dd className="text-white/55 line-through tabular-nums">
            {formatINR(viaChannel)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-medium text-white">Booked direct with us</dt>
          <dd className="font-display text-xl text-white tabular-nums">
            {formatINR(direct)}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl bg-brand-gold/15 px-5 py-4">
        <p className="text-sm font-medium text-brand-gold">You keep</p>
        <p className="font-display text-[2rem] text-brand-gold tabular-nums">
          {formatINR(saved)}
        </p>
      </div>

      <Button
        render={<Link href={`/stays/${property.slug}`} />}
        variant="accent"
        size="lg"
        className="mt-6 w-full"
      >
        See this home
        <ArrowRight />
      </Button>

      <p className="mt-4 text-xs leading-relaxed text-white/45">
        An estimate, not a quote: it models the {CHANNEL_MARKUP * 100}% a travel
        site typically adds between commission and the guest service fee. What
        you actually save depends on the site and the dates. Taxes are the same
        either way.
      </p>
    </div>
  );
}
