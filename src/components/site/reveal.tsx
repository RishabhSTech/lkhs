"use client";

import { motion } from "framer-motion";
import {
  useEffect, useLayoutEffect, useRef, useState, type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Layout effect on the client, plain effect on the server. The arming step
 * below must land before first paint, or the group flashes visible and then
 * hides itself.
 */
const useArmingEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Single-shot fade-and-rise on scroll. Respects reduced-motion via Framer.
 *
 * Use this for a section heading or a single standout block. For a grid, reach
 * for `RevealGroup` instead - wrapping every card in one of these was costing a
 * motion component per card and, more to the point, made the whole page arrive
 * at the same speed, which reads as lag rather than craft.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its direct children as they scroll into view using one observer and
 * a CSS delay ladder (see `.reveal-stagger` in globals.css). The children stay
 * plain elements, so a server-rendered card grid does not become nine client
 * components just to fade in.
 */
export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // `armed` is the safety interlock: the hiding class is only applied once
  // this component is running and has an observer attached. Server output -
  // and any client where scripting is off or IntersectionObserver is missing -
  // therefore renders the content plainly visible. Hiding first and relying on
  // JS to undo it means one broken script turns the page blank.
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useArmingEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return; // stay unarmed, i.e. visible
    }
    setArmed(true);

    // An observer always delivers one callback shortly after `observe()`,
    // whether or not the target is on screen. That first delivery is the proof
    // of life we wait for - cancel the failsafe on any callback, not just an
    // intersecting one. A timer that survives until the user scrolls would
    // reveal every group early and flatten the stagger it exists to protect.
    let failsafe: number | undefined = window.setTimeout(() => {
      setInView(true);
    }, 1500);

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(failsafe);
        failsafe = undefined;
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect(); // once only
      },
      { rootMargin: "-60px 0px" },
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (failsafe !== undefined) window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div
      ref={ref}
      data-in-view={inView}
      className={cn(armed && "reveal-stagger", className)}
    >
      {children}
    </div>
  );
}
