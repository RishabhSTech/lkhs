import "server-only";
import { db } from "@/lib/db";
import {
  endOfMonthUTC, startOfMonthUTC, toISODate, toUTCDate,
} from "@/lib/dates";
import { buildQuote } from "@/lib/pricing/engine";

export type PropertyDay = {
  date: string;
  price: number;
  appliedRules: string[];
  reservation: {
    id: string;
    code: string;
    guestName: string;
    source: string;
    isArrival: boolean;
    isDeparture: boolean;
  } | null;
  blockReason: string | null;
};

/**
 * A single property's month: one entry per day with its price and whatever
 * occupies it. Arrival/departure flags let the grid draw stay boundaries.
 */
export async function getPropertyMonth(propertyId: string, month: Date) {
  const monthStart = startOfMonthUTC(month);
  const monthEnd = endOfMonthUTC(month);

  const property = await db.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: {
      units: { orderBy: { name: "asc" } },
      pricingRules: { where: { isActive: true } },
      images: { take: 1, orderBy: { sortOrder: "asc" } },
    },
  });

  const unitIds = property.units.map((u) => u.id);

  const [nights, overrides] = await Promise.all([
    db.inventoryNight.findMany({
      where: { unitId: { in: unitIds }, date: { gte: monthStart, lte: monthEnd } },
      include: {
        reservation: {
          include: { guest: { select: { name: true } } },
        },
      },
    }),
    db.dailyRate.findMany({
      where: { propertyId, date: { gte: monthStart, lte: monthEnd } },
    }),
  ]);

  const quote = buildQuote({
    basePrice: Number(property.basePrice),
    cleaningFee: 0,
    checkIn: monthStart,
    checkOut: new Date(monthEnd.getTime() + 86_400_000),
    rules: property.pricingRules,
    dailyRateOverrides: Object.fromEntries(
      overrides.map((o) => [toISODate(o.date), Number(o.price)]),
    ),
  });
  const priceByDate = new Map(quote.nights.map((n) => [n.date, n]));

  // One row per unit so multi-unit properties stay legible.
  const unitRows = property.units.map((unit) => {
    const unitNights = new Map(
      nights
        .filter((n) => n.unitId === unit.id)
        .map((n) => [toISODate(n.date), n]),
    );

    const days: PropertyDay[] = [];
    for (
      let d = new Date(monthStart);
      d <= monthEnd;
      d = new Date(d.getTime() + 86_400_000)
    ) {
      const iso = toISODate(d);
      const night = unitNights.get(iso);
      const priced = priceByDate.get(iso);
      const res = night?.reservation;

      days.push({
        date: iso,
        price: priced?.price ?? Number(property.basePrice),
        appliedRules: priced?.appliedRules ?? [],
        reservation: res
          ? {
              id: res.id,
              code: res.code,
              guestName: res.guest.name,
              source: res.source,
              isArrival: toISODate(toUTCDate(res.checkIn)) === iso,
              isDeparture:
                toISODate(toUTCDate(res.checkOut)) ===
                toISODate(new Date(d.getTime() + 86_400_000)),
            }
          : null,
        blockReason: night?.blockReason ?? null,
      });
    }

    return { unitId: unit.id, unitName: unit.name, days };
  });

  const occupiedNights = nights.filter((n) => n.reservationId).length;
  const capacity = unitIds.length * monthEnd.getUTCDate();

  return {
    property: {
      id: property.id,
      name: property.name,
      slug: property.slug,
      locationArea: property.locationArea,
      basePrice: Number(property.basePrice),
      image: property.images[0]?.url ?? null,
    },
    month: toISODate(monthStart),
    unitRows,
    occupancyPercent: capacity > 0 ? (occupiedNights / capacity) * 100 : 0,
    nightsBooked: occupiedNights,
    capacity,
  };
}

/** Ordered property list so the calendar can step between them with arrows. */
export async function getPropertyNavigation() {
  return db.property.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
