import "server-only";
import { db } from "@/lib/db";
import { addDays, toISODate, toUTCDate } from "@/lib/dates";

export type CalendarBlock = {
  reservationId: string | null;
  code: string | null;
  guestName: string | null;
  source: string;
  status: string | null;
  blockReason: string | null;
  startDate: string;
  nights: number;
  total: number | null;
};

export type CalendarRow = {
  unitId: string;
  unitName: string;
  propertyId: string;
  propertyName: string;
  blocks: CalendarBlock[];
};

/**
 * Builds contiguous blocks per unit from InventoryNight rows, so the grid
 * renders one bar per stay rather than one cell per night.
 */
export async function getCalendarData(from: Date, days: number) {
  const start = toUTCDate(from);
  const end = addDays(start, days);

  const units = await db.unit.findMany({
    include: { property: { select: { id: true, name: true } } },
    orderBy: [{ property: { name: "asc" } }, { name: "asc" }],
  });

  const nights = await db.inventoryNight.findMany({
    where: { date: { gte: start, lt: end } },
    include: {
      reservation: {
        include: { guest: { select: { name: true } } },
      },
    },
    orderBy: { date: "asc" },
  });

  const byUnit = new Map<string, typeof nights>();
  for (const night of nights) {
    const list = byUnit.get(night.unitId) ?? [];
    list.push(night);
    byUnit.set(night.unitId, list);
  }

  const rows: CalendarRow[] = units.map((unit) => {
    const unitNights = byUnit.get(unit.id) ?? [];
    const blocks: CalendarBlock[] = [];

    let current: CalendarBlock | null = null;
    let previousDate: Date | null = null;

    for (const night of unitNights) {
      const key = night.reservationId ?? `block:${night.blockReason ?? "held"}`;
      const isContiguous =
        previousDate !== null &&
        night.date.getTime() === addDays(previousDate, 1).getTime();
      const sameEntity =
        current !== null &&
        (current.reservationId ?? `block:${current.blockReason ?? "held"}`) === key;

      if (current && isContiguous && sameEntity) {
        current.nights += 1;
      } else {
        if (current) blocks.push(current);
        current = {
          reservationId: night.reservationId,
          code: night.reservation?.code ?? null,
          guestName: night.reservation?.guest.name ?? null,
          source: night.reservation?.source ?? "BLOCK",
          status: night.reservation?.status ?? null,
          blockReason: night.blockReason,
          startDate: toISODate(night.date),
          nights: 1,
          total: night.reservation ? Number(night.reservation.total) : null,
        };
      }
      previousDate = night.date;
    }
    if (current) blocks.push(current);

    return {
      unitId: unit.id,
      unitName: unit.name,
      propertyId: unit.property.id,
      propertyName: unit.property.name,
      blocks,
    };
  });

  return rows;
}
