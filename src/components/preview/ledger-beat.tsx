"use client";

import { useId, useState } from "react";
import { Section } from "@/components/site/section";
import { formatINR } from "@/lib/format";
import { useStayThread } from "@/components/preview/stay-thread";

/**
 * Beat five: what does it cost, and why here?
 *
 * "Book direct and you keep the difference" is the most important claim on
 * this page and, as a sentence, it is completely inert. Every operator says
 * it. Letting someone move a slider and watch the arithmetic run turns the
 * claim into something they worked out themselves, against the home they have
 * just been walked through at its real nightly rate.
 *
 * Set in type on a hairline, not in a card. The figures are the content here,
 * and boxing them would make the section read as a pricing widget bolted onto
 * a story rather than as the story's ledger.
 */

/**
 * The mark-up being modelled. The channels take fourteen to sixteen percent
 * between host commission and the guest-side service fee, so this uses the
 * midpoint and says so on screen. A savings figure that cannot show its
 * working is worth less than no figure at all.
 */
const CHANNEL_MARKUP = 0.15;
const MIN_NIGHTS = 2;
const MAX_NIGHTS = 14;

export function LedgerBeat() {
  const { active } = useStayThread();
  const id = useId();
  const [nights, setNights] = useState(4);

  const { home } = active;
  const direct = home.basePrice * nights;
  const viaChannel = Math.round(direct * (1 + CHANNEL_MARKUP));
  const saved = viaChannel - direct;
  const progress = (nights - MIN_NIGHTS) / (MAX_NIGHTS - MIN_NIGHTS);

  return (
    <Section size="feature" className="border-t border-border">
      <h2 className="headline max-w-[20ch] font-display text-[clamp(2.25rem,4.4vw,3.5rem)] text-foreground">
        The same home, <em className="italic">without</em> the middle.
      </h2>
      <p className="copy mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
        The travel sites take fourteen to sixteen percent between commission and
        the guest service fee. Book here and that stays between you and the
        home. We never undercut ourselves on the channels, so this is always the
        lower number.
      </p>

      <div className="mt-12 lg:mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <p className="text-[0.9375rem] font-medium text-foreground">
            {home.name}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatINR(home.basePrice)} a night
          </p>
        </div>

        <div className="mt-8 max-w-lg">
          <label
            htmlFor={id}
            className="flex items-baseline justify-between gap-4 text-sm text-muted-foreground"
          >
            How many nights?
            <span className="font-display text-3xl text-brand-blue tabular-nums">
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
            // The filled portion is a value-driven gradient on the track
            // itself rather than an overlay element, so the fill cannot drift
            // out of sync with the thumb on any browser.
            style={{
              background: `linear-gradient(to right, var(--color-brand-blue) 0%, var(--color-brand-blue) ${progress * 100}%, var(--color-border) ${progress * 100}%, var(--color-border) 100%)`,
            }}
            className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand-blue [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(11,47,107,0.35)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
          />
          <div
            aria-hidden
            className="mt-2 flex justify-between text-xs text-muted-foreground/70 tabular-nums"
          >
            <span>{MIN_NIGHTS} nights</span>
            <span>{MAX_NIGHTS} nights</span>
          </div>
        </div>

        {/* Three rows, so hairlines still read as structure rather than as a
            spec table. The figures hang on a shared right edge and are
            tabular, which is what lets the eye subtract them without help. */}
        <dl className="mt-12 border-t border-border">
          <div className="flex items-baseline justify-between gap-6 border-b border-border py-5">
            <dt className="text-[0.9375rem] text-muted-foreground">
              On a travel site, around
            </dt>
            <dd className="font-display text-2xl text-muted-foreground line-through tabular-nums">
              {formatINR(viaChannel)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 border-b border-border py-5">
            <dt className="text-[0.9375rem] font-medium text-foreground">
              Booked direct with us
            </dt>
            <dd className="font-display text-2xl text-foreground tabular-nums">
              {formatINR(direct)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-7">
            <dt className="text-[0.9375rem] font-medium text-brand-blue">
              You keep
            </dt>
            <dd className="font-display text-[clamp(2.5rem,6vw,4rem)] leading-none text-brand-blue tabular-nums">
              {formatINR(saved)}
            </dd>
          </div>
        </dl>

        <p className="copy mt-6 max-w-lg text-xs leading-relaxed text-muted-foreground/80">
          An estimate, not a quote. It models the {CHANNEL_MARKUP * 100}% a
          travel site typically adds between commission and the guest service
          fee. What you actually save depends on the site and the dates. Taxes
          are the same either way.
        </p>
      </div>
    </Section>
  );
}
