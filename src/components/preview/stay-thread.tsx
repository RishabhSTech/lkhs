"use client";

import {
  createContext, useCallback, useContext, useMemo, useState,
} from "react";
import type { ReactNode } from "react";
import type { CityBundle } from "@/components/preview/types";

/**
 * The through-line.
 *
 * The old homepage was eleven bands that happened to sit above one another.
 * This is the one piece of state that turns them into a sequence: a visitor
 * picks a city near the top, and every beat below reads the same selection,
 * so the page assembles a single real, bookable stay as it is scrolled.
 *
 * One variable, not two. An earlier draft also threaded a chosen date range
 * out of a portfolio calendar; dropping that beat left the mechanism small
 * enough to state in a sentence, which is usually the sign that it will
 * survive contact with the code.
 *
 * Ordinary React state rather than a motion value: this changes on click, not
 * on every frame, so there is nothing here for the compositor to care about.
 */

type StayThread = {
  bundles: CityBundle[];
  /** Never null. Falls back to the first bundle if a slug goes stale. */
  active: CityBundle;
  citySlug: string;
  selectCity: (slug: string) => void;
};

const StayThreadContext = createContext<StayThread | null>(null);

export function StayThreadProvider({
  bundles,
  children,
}: {
  bundles: CityBundle[];
  children: ReactNode;
}) {
  // The default is the busiest city, decided on the server. A page that opens
  // in a null state and asks to be clicked before it says anything is a page
  // that has mistaken its mechanism for its content.
  const [citySlug, setCitySlug] = useState(bundles[0]?.city.slug ?? "");

  const active = useMemo(
    () => bundles.find((b) => b.city.slug === citySlug) ?? bundles[0],
    [bundles, citySlug],
  );

  const selectCity = useCallback((slug: string) => setCitySlug(slug), []);

  const value = useMemo(
    () => ({ bundles, active, citySlug, selectCity }),
    [bundles, active, citySlug, selectCity],
  );

  return (
    <StayThreadContext.Provider value={value}>
      {children}
    </StayThreadContext.Provider>
  );
}

export function useStayThread(): StayThread {
  const ctx = useContext(StayThreadContext);
  if (!ctx) {
    throw new Error("useStayThread must be used inside <StayThreadProvider>.");
  }
  return ctx;
}
