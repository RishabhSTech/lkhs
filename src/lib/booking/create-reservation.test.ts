import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { createReservation, InventoryConflictError } from "./create-reservation";

/**
 * Exercises the one invariant the whole booking system depends on: the
 * unique (unitId, date) constraint on InventoryNight is what actually
 * prevents a double-booking, not application-level locking. Runs against a
 * real database (no mocking Prisma) because that constraint only exists
 * there - a unit test of the JS wouldn't catch a migration that dropped it.
 *
 * Creates and tears down its own throwaway property/unit so it can run
 * against a shared dev database without disturbing seeded data.
 */
describe("createReservation - inventory locking", () => {
  const marker = `vitest-inv-lock-${Date.now()}`;
  let propertyId: string;
  let unitId: string;

  beforeAll(async () => {
    const property = await db.property.create({
      data: {
        slug: marker,
        name: `Test property ${marker}`,
        description: "Fixture property created by the inventory-locking test.",
        locationArea: "Test Area",
        addressLine: "1 Test Lane",
        maxGuests: 2,
        bedrooms: 1,
        bathrooms: 1,
        beds: 1,
        basePrice: 2000,
        units: {
          create: [{ name: "Unit A", maxGuests: 2, bedrooms: 1, bathrooms: 1, beds: 1 }],
        },
      },
      include: { units: true },
    });
    propertyId = property.id;
    unitId = property.units[0].id;
  });

  afterAll(async () => {
    if (!propertyId) return;
    // Transaction has no cascade from Reservation, so it must go first or the
    // reservation delete below is blocked by the FK.
    await db.transaction.deleteMany({ where: { propertyId } });
    const reservations = await db.reservation.findMany({
      where: { propertyId },
      select: { guestId: true },
    });
    // Cascades ReservationPayment, ReservationGuest, Message; SetNulls
    // InventoryNight.reservationId (the nights themselves go with the unit).
    await db.reservation.deleteMany({ where: { propertyId } });
    await db.guest.deleteMany({ where: { id: { in: reservations.map((r) => r.guestId) } } });
    await db.notification.deleteMany({ where: { body: { contains: marker } } });
    // Cascades Unit, which cascades InventoryNight.
    await db.property.delete({ where: { id: propertyId } });
  });

  it("lets exactly one of two concurrent bookings for the same unit-nights through", async () => {
    const checkIn = parseISODate("2031-03-10");
    const checkOut = parseISODate("2031-03-13");

    const attempt = (n: number) =>
      createReservation({
        propertyId,
        unitId,
        checkIn,
        checkOut,
        adults: 1,
        guest: { name: `Guest ${marker} race-${n}`, email: `${marker}-race-${n}@example.test` },
      });

    const results = await Promise.allSettled([attempt(1), attempt(2)]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(InventoryConflictError);

    // Exactly one night row per night - the loser's transaction rolled back
    // completely rather than leaving a partial write.
    const nights = await db.inventoryNight.findMany({
      where: { unitId, date: { gte: checkIn, lt: checkOut } },
    });
    expect(nights).toHaveLength(3);
  });

  it("rejects a second booking that overlaps an already-confirmed one by even a single night", async () => {
    const checkIn = parseISODate("2031-04-01");
    const checkOut = parseISODate("2031-04-04");

    await createReservation({
      propertyId,
      unitId,
      checkIn,
      checkOut,
      adults: 1,
      guest: { name: `Guest ${marker} first`, email: `${marker}-first@example.test` },
    });

    await expect(
      createReservation({
        propertyId,
        unitId,
        checkIn: parseISODate("2031-04-03"), // overlaps the last night only
        checkOut: parseISODate("2031-04-06"),
        adults: 1,
        guest: { name: `Guest ${marker} second`, email: `${marker}-second@example.test` },
      }),
    ).rejects.toBeInstanceOf(InventoryConflictError);
  });

  it("allows a back-to-back booking that starts the night the first one checks out", async () => {
    const checkIn = parseISODate("2031-05-01");
    const checkOut = parseISODate("2031-05-04");

    await createReservation({
      propertyId,
      unitId,
      checkIn,
      checkOut,
      adults: 1,
      guest: { name: `Guest ${marker} back-to-back-1`, email: `${marker}-btb1@example.test` },
    });

    const second = await createReservation({
      propertyId,
      unitId,
      checkIn: checkOut, // check-in the night the first stay checks out
      checkOut: parseISODate("2031-05-06"),
      adults: 1,
      guest: { name: `Guest ${marker} back-to-back-2`, email: `${marker}-btb2@example.test` },
    });

    expect(second.status).toBe("CONFIRMED");
  });
});
