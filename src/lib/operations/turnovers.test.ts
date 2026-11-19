import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addDays, todayUTC } from "@/lib/dates";
import { syncTurnoverTasks } from "./turnovers";

/**
 * Turnover tasks are derived from bookings rather than created at each of the
 * three places a booking can come from, so the scheduler has to be idempotent
 * and follow date changes and cancellations. Runs against the dev database
 * with its own throwaway property, cleaner and guest.
 */
describe("syncTurnoverTasks", () => {
  const marker = `vitest-turnover-${Date.now()}`;
  let propertyId: string;
  let unitId: string;
  let guestId: string;
  let cleanerId: string;
  let reservationId: string;

  beforeAll(async () => {
    const property = await db.property.create({
      data: {
        slug: marker,
        name: `Test property ${marker}`,
        description: "Fixture property for the turnover scheduler test.",
        locationArea: "Test Area",
        addressLine: "1 Test Lane",
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        beds: 1,
        basePrice: 2000,
        units: { create: [{ name: "Unit A", maxGuests: 2, bedrooms: 1, bathrooms: 1, beds: 1 }] },
      },
      include: { units: true },
    });
    propertyId = property.id;
    unitId = property.units[0].id;
    const cleaner = await db.user.create({
      data: {
        name: `Cleaner ${marker}`,
        email: `${marker}@example.test`,
        role: "CLEANER",
        propertyAssignments: { create: [{ propertyId }] },
      },
    });
    cleanerId = cleaner.id;
    const guest = await db.guest.create({ data: { name: `Guest ${marker}` } });
    guestId = guest.id;
    const checkIn = addDays(todayUTC(), 1);
    const reservation = await db.reservation.create({
      data: {
        code: marker.slice(-12),
        propertyId,
        unitId,
        guestId,
        checkIn,
        checkOut: addDays(checkIn, 2),
        status: "CONFIRMED",
        nightlyRate: 2000,
        nights: 2,
        subtotal: 4000,
        total: 4000,
      },
    });
    reservationId = reservation.id;
  });

  afterAll(async () => {
    if (!propertyId) return;
    await db.cleaningTask.deleteMany({ where: { propertyId } });
    await db.reservation.deleteMany({ where: { propertyId } });
    if (guestId) await db.guest.delete({ where: { id: guestId } });
    if (cleanerId) await db.user.delete({ where: { id: cleanerId } });
    await db.property.delete({ where: { id: propertyId } });
  });

  const tasks = () => db.cleaningTask.findMany({ where: { reservationId } });

  it("creates one task on the checkout day, assigned to the property's only cleaner", async () => {
    await syncTurnoverTasks();
    await syncTurnoverTasks();
    const found = await tasks();
    expect(found).toHaveLength(1);
    expect(found[0].status).toBe("CHECKOUT");
    expect(found[0].assignedToId).toBe(cleanerId);
    expect(found[0].scheduledDate.toISOString().slice(0, 10)).toBe(
      addDays(todayUTC(), 3).toISOString().slice(0, 10),
    );
  });

  it("moves an unstarted task when the booking's checkout changes", async () => {
    const newCheckOut = addDays(todayUTC(), 5);
    await db.reservation.update({ where: { id: reservationId }, data: { checkOut: newCheckOut } });
    await syncTurnoverTasks();
    const found = await tasks();
    expect(found).toHaveLength(1);
    expect(found[0].scheduledDate.getTime()).toBe(newCheckOut.getTime());
  });

  it("drops an unstarted task when the booking is cancelled", async () => {
    await db.reservation.update({ where: { id: reservationId }, data: { status: "CANCELLED" } });
    await syncTurnoverTasks();
    expect(await tasks()).toHaveLength(0);
  });
});
