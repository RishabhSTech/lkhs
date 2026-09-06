import { db } from "@/lib/db";
import { eachNight, toUTCDate } from "@/lib/dates";

/** True when every night in the range is free on at least one unit. */
export async function isPropertyAvailable(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<boolean> {
  return (await findAvailableUnitId(propertyId, checkIn, checkOut)) !== null;
}

export async function findAvailableUnitId(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<string | null> {
  const nights = eachNight(checkIn, checkOut);
  if (nights.length === 0) return null;

  const units = await db.unit.findMany({
    where: { propertyId },
    select: { id: true },
  });
  if (units.length === 0) return null;

  const taken = await db.inventoryNight.findMany({
    where: {
      unitId: { in: units.map((u) => u.id) },
      date: { gte: toUTCDate(checkIn), lt: toUTCDate(checkOut) },
    },
    select: { unitId: true },
  });

  const blockedUnitIds = new Set(taken.map((t) => t.unitId));
  return units.find((u) => !blockedUnitIds.has(u.id))?.id ?? null;
}

/** Dates that are fully unavailable across all units - used to grey out calendars. */
export async function getBlockedDates(
  propertyId: string,
  from: Date,
  to: Date,
): Promise<string[]> {
  const units = await db.unit.findMany({
    where: { propertyId },
    select: { id: true },
  });
  if (units.length === 0) return [];

  const nights = await db.inventoryNight.findMany({
    where: {
      unitId: { in: units.map((u) => u.id) },
      date: { gte: toUTCDate(from), lte: toUTCDate(to) },
    },
    select: { date: true, unitId: true },
  });

  const countByDate = new Map<string, Set<string>>();
  for (const n of nights) {
    const key = n.date.toISOString().slice(0, 10);
    const set = countByDate.get(key) ?? new Set<string>();
    set.add(n.unitId);
    countByDate.set(key, set);
  }

  return [...countByDate.entries()]
    .filter(([, unitSet]) => unitSet.size >= units.length)
    .map(([date]) => date);
}
