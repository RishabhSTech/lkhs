import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { upsertBookingFromEmail } from "./sync";
import type { ExtractedBookingInfo } from "./extract-booking-info";

/**
 * Runs against the real database, same rationale as
 * create-reservation.test.ts: the interesting behavior - never silently
 * overwriting a real double-booking - is enforced by the InventoryNight
 * unique constraint, which only exists in the database.
 */
describe("upsertBookingFromEmail", () => {
  const marker = `vitest-mailbox-sync-${Date.now()}`;
  let propertyId: string;
  let unitId: string;
  const propertyName = `${marker} Test Villa`;

  function extraction(overrides: Partial<ExtractedBookingInfo>): ExtractedBookingInfo {
    return {
      classification: "BOOKING_CONFIRMED",
      guestName: `${marker} Guest`,
      guestEmail: `${marker}@example.test`,
      guestPhone: null,
      checkIn: "2032-02-10",
      checkOut: "2032-02-13",
      guestsCount: 2,
      propertyHint: propertyName,
      externalReservationId: null,
      amountTotal: 9000,
      currency: "INR",
      messageBody: "Booking confirmed.",
      confidence: 0.95,
      ...overrides,
    };
  }

  function envelope() {
    return { from: "noreply@booking.com", subject: "Reservation confirmed", receivedAt: new Date() };
  }

  beforeAll(async () => {
    const property = await db.property.create({
      data: {
        slug: `${marker}-villa`,
        name: propertyName,
        description: "Fixture property for mailbox sync tests.",
        locationArea: "Test Area",
        addressLine: "1 Test Lane",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 2,
        beds: 2,
        basePrice: 3000,
        units: { create: [{ name: "Unit A", maxGuests: 4, bedrooms: 2, bathrooms: 2, beds: 2 }] },
      },
      include: { units: true },
    });
    propertyId = property.id;
    unitId = property.units[0].id;
  });

  afterAll(async () => {
    if (!propertyId) return;
    await db.processedEmailMessage.deleteMany({ where: { emailMessageId: { startsWith: marker } } });
    const reservations = await db.reservation.findMany({ where: { propertyId }, select: { guestId: true } });
    await db.reservation.deleteMany({ where: { propertyId } });
    await db.guest.deleteMany({ where: { id: { in: reservations.map((r) => r.guestId) } } });
    await db.notification.deleteMany({ where: { body: { contains: marker } } });
    await db.property.delete({ where: { id: propertyId } });
  });

  it("creates a confirmed reservation from a high-confidence booking email", async () => {
    const emailMessageId = `${marker}-msg-1`;
    await upsertBookingFromEmail({
      emailMessageId,
      envelope: envelope(),
      source: "BOOKING_COM",
      extraction: extraction({ externalReservationId: `${marker}-conf-1` }),
    });

    const reservation = await db.reservation.findFirst({
      where: { propertyId, source: "BOOKING_COM", externalReservationId: `${marker}-conf-1` },
    });
    expect(reservation?.status).toBe("CONFIRMED");
    expect(reservation?.checkOut).toEqual(parseISODate("2032-02-13"));

    const processed = await db.processedEmailMessage.findUnique({ where: { emailMessageId } });
    expect(processed?.status).toBe("PROCESSED");
    expect(processed?.reservationId).toBe(reservation?.id);
  });

  it("updates the same reservation on a later email instead of duplicating it (idempotent on confirmation number)", async () => {
    const secondMessageId = `${marker}-msg-2`;
    await upsertBookingFromEmail({
      emailMessageId: secondMessageId,
      envelope: envelope(),
      source: "BOOKING_COM",
      // Same confirmation number, later email extends the stay by a night.
      extraction: extraction({ externalReservationId: `${marker}-conf-1`, checkOut: "2032-02-14" }),
    });

    const matching = await db.reservation.findMany({
      where: { propertyId, source: "BOOKING_COM", externalReservationId: `${marker}-conf-1` },
    });
    expect(matching).toHaveLength(1);
    expect(matching[0].checkOut).toEqual(parseISODate("2032-02-14"));
  });

  it("never silently overwrites a genuine double-booking", async () => {
    const existingGuest = await db.guest.create({
      data: { name: `${marker} Direct Guest`, email: `${marker}-direct@example.test` },
    });
    const checkIn = parseISODate("2032-03-01");
    const checkOut = parseISODate("2032-03-04");
    const directReservation = await db.reservation.create({
      data: {
        code: `LK-${marker}-DIRECT`,
        propertyId,
        unitId,
        guestId: existingGuest.id,
        checkIn,
        checkOut,
        status: "CONFIRMED",
        source: "DIRECT",
        nightlyRate: 3000,
        nights: 3,
        subtotal: 9000,
        total: 9000,
      },
    });
    await db.inventoryNight.createMany({
      data: [checkIn, new Date(Date.UTC(2032, 2, 2)), new Date(Date.UTC(2032, 2, 3))].map((date) => ({
        unitId,
        date,
        reservationId: directReservation.id,
      })),
    });

    const emailMessageId = `${marker}-msg-conflict`;
    await upsertBookingFromEmail({
      emailMessageId,
      envelope: envelope(),
      source: "AIRBNB",
      extraction: extraction({
        externalReservationId: `${marker}-conf-conflict`,
        checkIn: "2032-03-01",
        checkOut: "2032-03-04",
        guestEmail: `${marker}-conflict@example.test`,
        guestName: `${marker} Conflicting Guest`,
      }),
    });

    // The overlapping Airbnb "booking" must not have been created.
    const airbnbReservation = await db.reservation.findFirst({
      where: { propertyId, source: "AIRBNB", externalReservationId: `${marker}-conf-conflict` },
    });
    expect(airbnbReservation).toBeNull();

    const stillJustOne = await db.reservation.count({ where: { unitId, checkIn, checkOut } });
    expect(stillJustOne).toBe(1);

    const processed = await db.processedEmailMessage.findUnique({ where: { emailMessageId } });
    expect(processed?.status).toBe("FAILED");
    expect(processed?.error).toMatch(/double-booking/i);

    // The raw email is preserved as a message rather than lost.
    const loggedMessage = await db.message.findFirst({ where: { subject: { contains: "manual reconciliation" } } });
    expect(loggedMessage).not.toBeNull();
  });
});
