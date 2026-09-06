"use client";

import Image from "next/image";
import { useCallback, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type HowItWorksStep = {
  title: string;
  body: string;
  /** A real photograph from live inventory - never an illustration of a UI. */
  image: string;
  /** The reassurance that belongs with this step, not with the others. */
  caption: string;
};

/**
 * The three steps of booking, as a tablist rather than a static grid.
 *
 * A grid of three numbered paragraphs is the version of this section every
 * site has, and nobody reads it. Making it one step at a time buys two things:
 * each step gets a photograph large enough to be worth looking at, and the
 * panel advancing on its own is what pulls the eye back to a section people
 * would otherwise scroll straight past.
 *
 * It is a real tablist - arrow keys move between steps, the panel is labelled
 * by its tab - because the alternative is a widget that only works for people
 * using a mouse. Auto-advance stops permanently on the first interaction: once
 * someone has chosen a step, moving it under them is hostile.
 */
export function HowItWorks({ steps }: { steps: HowItWorksStep[] }) {
  const id = useId();
  const [active, setActive] = useState(0);
  const [taken, setTaken] = useState(false); // user has steered; stop advancing
  const [paused, setPaused] = useState(false);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const choose = useCallback((index: number) => {
    setTaken(true);
    setActive(index);
  }, []);

  function onKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (active + delta + steps.length) % steps.length;
    choose(next);
    tabsRef.current[next]?.focus();
  }

  const current = steps[active];

  return (
    <div
      className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        role="tablist"
        aria-label="How booking works"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="order-2 flex flex-col lg:order-1"
      >
        {steps.map((step, index) => {
          const selected = index === active;
          return (
            <button
              key={step.title}
              ref={(node) => {
                tabsRef.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(index)}
              className={cn(
                "group relative cursor-pointer border-l-2 py-5 pl-6 text-left transition-colors duration-300 outline-none first:pt-0 last:pb-0",
                selected ? "border-brand-azure" : "border-border",
              )}
            >
              {/* The rail fill is both the progress indicator and the timer:
                  it runs the length of the dwell so the advance is telegraphed
                  rather than sprung on you, it freezes under the pointer while
                  someone is reading, and finishing is what moves the section
                  on. Once a step has been chosen by hand it stops for good -
                  moving the panel out from under someone who just picked it is
                  the thing that makes carousels infuriating. */}
              {selected && !taken && (
                <span
                  aria-hidden
                  key={active}
                  data-paused={paused}
                  onAnimationEnd={() =>
                    setActive((i) => (i + 1) % steps.length)
                  }
                  className="step-dwell absolute top-0 -left-0.5 h-full w-0.5 bg-brand-blue"
                />
              )}
              <span
                className={cn(
                  "font-display text-sm tracking-wide tabular-nums transition-colors",
                  selected ? "text-brand-azure" : "text-muted-foreground",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "mt-1.5 block font-display-sm text-xl transition-colors sm:text-2xl",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {step.title}
              </span>
              <span
                className={cn(
                  "block overflow-hidden text-[0.9375rem] leading-relaxed text-muted-foreground transition-all duration-[400ms]",
                  // Collapsing the body rather than dimming it is what keeps
                  // three steps from reading as three paragraphs of noise.
                  selected ? "mt-2 max-h-60 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                {step.body}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${active}`}
        className="relative order-1 aspect-[4/3] overflow-hidden rounded-3xl bg-muted lg:order-2 lg:aspect-[5/4]"
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={current.image}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 52vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-brand-ink/85 to-transparent"
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={current.caption}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-5 bottom-5 text-[0.9375rem] font-medium text-white sm:inset-x-7 sm:bottom-7"
          >
            {current.caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
