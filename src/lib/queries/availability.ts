import "server-only";
import { cache } from "react";
import type { PricingRule } from "@prisma/client";
import { db } from "@/lib/db";
import type {
  NightAvailability, PortfolioAvailability,
} from "@/components/site/availability-explorer";
import {
  addMonths, eachDayInclusive, endOfMonthUTC, isWeekendNight, startOfMonthUTC,
  toISODate, todayUTC,
} from "@/lib/dates";

export type { NightAvailability, PortfolioAvailability };

/**
 * Portfolio-wide availability, one row per calendar night.
 *
 * The homepage asks a visitor for their dates in the hero and then never
 * mentions dates again — which means the single question that decides whether
 * a trip happens at all ("is anything free when I want to go, and what will
 * it cost?") went unanswered on the page best placed to answer it. This
 * module is the query behind that answer.
 *
 * A night's `rates` array carries one slot per ACTIVE property: a number is
 * that property's real rate for the night, and `null` means every one of its
 * units is already taken. Nothing here is ever a headline figure borrowed
 * from a home that cannot actually be booked.
 */

/**
 * Only the date-driven rules. A calendar cell is one night with no stay
 * attached to it, so the rules that price a *stay* rather than a *night* —
 * LONG_STAY needs a length, LAST_MINUTE needs a check-in date — have no
 * defined answer here. Applying them anyway would quote a discount the
 * visitor cannot actually get by clicking the cell, which is exactly the kind
 * of number that destroys trust in every other figure on the page.
 */
const DATE_DRIVEN: ReadonlySet<PricingRule["type"]> = new Set([
  "WEEKEND", "FRIDAY", "SATURDAY", "HOLIDAY", "HIGH_DEMAND", "CUSTOM_RANGE",
]);

function ruleAppliesToNight(rule: PricingRule, night: Date): boolean {
  if (!rule.isActive || !DATE_DRIVEN.has(rule.type)) return false;

  const withinWindow =
    (!rule.startDate || night >= new Date(rule.startDate)) &&
    (!rule.endDate || night <= new Date(rule.endDate));

  switch (rule.type) {
    case "WEEKEND":
      return isWeekendNight(night);
    case "FRIDAY":
      return night.getUTCDay() === 5;
    case "SATURDAY":
      return night.getUTCDay() === 6;
    // These three are only ever meaningful inside an explicit window; a rule
    // of this type with no dates set would otherwise apply to every night of
    // the year.
    case "HOLIDAY":
    case "HIGH_DEMAND":
    case "CUSTOM_RANGE":
      return Boolean(rule.startDate && rule.endDate) && withinWindow;
    default:
      return false;
  }
}

/**
 * Mirrors `buildQuote`'s ordering deliberately: an explicit DailyRate wins
 * outright, otherwise active rules stack in priority order on the base price.
 * Kept as its own function rather than calling `buildQuote` because that one
 * prices a whole stay — nights, cleaning fee, discount and tax — and we need a
 * single night's headline rate for a few thousand property/date pairs.
 */
function nightlyPrice(
  basePrice: number,
  rules: PricingRule[],
  overrides: Map<string, number>,
  night: Date,
  iso: string,
): number {
  const override = overrides.get(iso);
  if (override !== undefined) return override;

  let price = basePrice;
  for (const rule of rules) {
    if (!ruleAppliesToNight(rule, night)) continue;
    const value = Number(rule.adjustmentValue);
    price =
      rule.adjustmentType === "PERCENT"
        ? price + (price * value) / 100
        : price + value;
  }
  return Math.round(price);
}

/**
 * Reads the whole window in two queries and resolves it in memory. At a dozen
 * properties over four months that is roughly 1,500 property-night pairs —
 * cheap enough that doing it per-night in SQL would cost more round trips than
 * it saves work, and the page is prerendered on a 300s revalidate anyway.
 */
export const getPortfolioAvailability = cache(
  async function getPortfolioAvailability(
    months = 4,
  ): Promise<PortfolioAvailability> {
    const from = todayUTC();
    const to = endOfMonthUTC(addMonths(startOfMonthUTC(from), months - 1));

    const properties = await db.property.findMany({
      where: { status: "ACTIVE" },
      orderBy: { basePrice: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        basePrice: true,
        units: { select: { id: true } },
        pricingRules: { where: { isActive: true } },
        dailyRates: {
          where: { date: { gte: from, lte: to } },
          select: { date: true, price: true },
        },
      },
    });

    if (properties.length === 0) {
      return { homes: [], nights: [], floorPrice: null };
    }

    const unitIds = properties.flatMap((p) => p.units.map((u) => u.id));

    // A row in InventoryNight exists only when that night is taken, so this is
    // the complete set of unavailability in the window — absence is the
    // availability.
    const taken = unitIds.length
      ? await db.inventoryNight.findMany({
          where: { unitId: { in: unitIds }, date: { gte: from, lte: to } },
          select: { unitId: true, date: true },
        })
      : [];

    const blocked = new Map<string, Set<string>>();
    for (const row of taken) {
      const iso = toISODate(row.date);
      const set = blocked.get(iso);
      if (set) set.add(row.unitId);
      else blocked.set(iso, new Set([row.unitId]));
    }

    const prepared = properties.map((p) => ({
      slug: p.slug,
      name: p.name,
      basePrice: Number(p.basePrice),
      unitIds: p.units.map((u) => u.id),
      // Highest priority first, matching the pricing engine.
      rules: [...p.pricingRules].sort((a, b) => b.priority - a.priority),
      overrides: new Map(
        p.dailyRates.map((r) => [toISODate(r.date), Number(r.price)]),
      ),
    }));

    const nights = eachDayInclusive(from, to).map((night) => {
      const iso = toISODate(night);
      const blockedUnits = blocked.get(iso);

      const rates = prepared.map((property) => {
        // No units means nothing to sell — `findAvailableUnitId` treats such a
        // property as unbookable and so must this, or the calendar would
        // advertise a home the booking flow then refuses.
        const free = property.unitIds.some(
          (unitId) => !blockedUnits?.has(unitId),
        );
        if (!free) return null;

        const price = nightlyPrice(
          property.basePrice,
          property.rules,
          property.overrides,
          night,
          iso,
        );
        return price;
      });

      return { date: iso, rates };
    });

    // Derived from the finished data rather than accumulated inside the map:
    // a `let` mutated from within a callback is narrowed back to its
    // initialiser at any use site the compiler cannot prove the callback
    // reached, which is exactly the shape that silently types as `null` here.
    const floorPrice = nights.reduce<number | null>((low, night) => {
      for (const rate of night.rates) {
        if (rate !== null && (low === null || rate < low)) low = rate;
      }
      return low;
    }, null);

    return {
      homes: prepared.map((p) => ({ slug: p.slug, name: p.name })),
      nights,
      floorPrice,
    };
  },
);
