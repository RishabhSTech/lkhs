import "server-only";
import { db } from "@/lib/db";
import { addDays, todayUTC } from "@/lib/dates";
import { onOperatingProperty } from "@/lib/property/back-office";

/** How far ahead turnover tasks are created from confirmed checkouts. */
const HORIZON_DAYS = 14;
/** A task nobody has started yet can still be moved or dropped automatically. */
const UNSTARTED = ["CHECKOUT", "CLEANING_REQUIRED"] as const;

/**
 * Keeps the cleaning list in step with bookings, whichever way they arrived
 * (website, OTA mailbox, or typed in by hand):
 *
 * - every confirmed stay checking out in the next two weeks gets one task on
 *   its checkout day, assigned to the property's cleaner when exactly one is
 *   assigned to it;
 * - an unstarted task follows its booking if the checkout date moves;
 * - an unstarted task is dropped if its booking is cancelled.
 *
 * Idempotent and cheap - safe to call on every load of the operations views.
 */
export async function syncTurnoverTasks() {
  const today = todayUTC();
  const horizon = addDays(today, HORIZON_DAYS);

  const [reservations, linkedTasks] = await Promise.all([
    db.reservation.findMany({
      where: {
        status: { in: ["CONFIRMED", "COMPLETED"] },
        checkOut: { gte: addDays(today, -1), lte: horizon },
        // Retired properties get no new turnover tasks.
        ...onOperatingProperty,
      },
      select: { id: true, propertyId: true, checkOut: true },
    }),
    db.cleaningTask.findMany({
      where: { reservationId: { not: null }, status: { in: [...UNSTARTED] } },
      select: {
        id: true,
        reservationId: true,
        scheduledDate: true,
        reservation: { select: { status: true, checkOut: true } },
      },
    }),
  ]);

  const existing = await db.cleaningTask.findMany({
    where: { reservationId: { in: reservations.map((r) => r.id) } },
    select: { reservationId: true },
  });
  const covered = new Set(existing.map((t) => t.reservationId));
  const missing = reservations.filter((r) => !covered.has(r.id));

  const stale = linkedTasks.filter(
    (t) => t.reservation && (t.reservation.status === "CANCELLED" || t.reservation.status === "NO_SHOW"),
  );
  const moved = linkedTasks.filter(
    (t) =>
      t.reservation &&
      t.reservation.status !== "CANCELLED" &&
      t.reservation.status !== "NO_SHOW" &&
      t.reservation.checkOut.getTime() !== t.scheduledDate.getTime(),
  );

  if (missing.length === 0 && stale.length === 0 && moved.length === 0) return;

  let defaultCleaner = new Map<string, string>();
  if (missing.length > 0) {
    const assignments = await db.propertyAssignment.findMany({
      where: {
        propertyId: { in: [...new Set(missing.map((r) => r.propertyId))] },
        user: { role: "CLEANER" },
      },
      select: { propertyId: true, userId: true },
    });
    const byProperty = new Map<string, string[]>();
    for (const a of assignments) byProperty.set(a.propertyId, [...(byProperty.get(a.propertyId) ?? []), a.userId]);
    defaultCleaner = new Map(
      [...byProperty].filter(([, users]) => users.length === 1).map(([p, users]) => [p, users[0]]),
    );
  }

  await db.$transaction([
    ...(missing.length
      ? [
          db.cleaningTask.createMany({
            data: missing.map((r) => ({
              propertyId: r.propertyId,
              reservationId: r.id,
              scheduledDate: r.checkOut,
              status: r.checkOut <= today ? ("CLEANING_REQUIRED" as const) : ("CHECKOUT" as const),
              assignedToId: defaultCleaner.get(r.propertyId) ?? null,
              notes: null,
            })),
          }),
        ]
      : []),
    ...(stale.length ? [db.cleaningTask.deleteMany({ where: { id: { in: stale.map((t) => t.id) } } })] : []),
    ...moved.map((t) =>
      db.cleaningTask.update({ where: { id: t.id }, data: { scheduledDate: t.reservation!.checkOut } }),
    ),
  ]);
}
