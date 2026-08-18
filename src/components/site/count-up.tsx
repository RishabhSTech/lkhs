"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatINR } from "@/lib/format";

/**
 * `useLayoutEffect` on the client so the arming step below lands before the
 * browser paints; the plain effect on the server keeps React quiet during SSR.
 */
const useArmingEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * A number that counts up the first time it scrolls into view.
 *
 * The server renders the *final* value, not zero. That ordering matters: with
 * scripting off, or if this component never hydrates, the page still states
 * the real figure — which is the entire point of the band it sits in. The
 * reset to zero happens in a layout effect, before paint, so the animation
 * still starts from nothing without ever flashing the wrong number.
 */
/**
 * Named formats rather than a formatter callback: this is a client component,
 * and a function prop cannot cross the server/client boundary — the caller is
 * a server component, so passing one fails the render outright.
 */
const FORMATS = {
  integer: (n: number) => String(Math.round(n)),
  rating: (n: number) => n.toFixed(1),
  inr: formatINR,
} satisfies Record<string, (n: number) => string>;

export type CountUpFormat = keyof typeof FORMATS;

export function CountUp({
  value,
  format = "integer",
  duration = 1400,
  className,
}: {
  value: number;
  format?: CountUpFormat;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const render = FORMATS[format];
  const [display, setDisplay] = useState(() => render(value));

  useArmingEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return; // leave the final value standing
    }

    setDisplay(render(0));
    let frame = 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // Cubic ease-out: the figure lands rather than stopping dead, and
          // most of the movement happens early where the eye is still on it.
          const eased = 1 - Math.pow(1 - t, 3);
          setDisplay(render(value * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { rootMargin: "-40px 0px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration, render]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
