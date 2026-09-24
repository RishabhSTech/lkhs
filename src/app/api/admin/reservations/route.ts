import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { createReservation, confirmReservation, InventoryConflictError } from "@/lib/booking/create-reservation";

const schema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(16),
  children: z.number().int().min(0).max(16).default(0),
  name: z.string().min(2, "Enter the guest name."),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().min(8, "Enter a valid phone number.").optional().or(z.literal("")),
  source: z.enum(["DIRECT", "AIRBNB", "BOOKING_COM", "AGODA", "OTHER"]).default("DIRECT"),
  status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED"),
  grossRevenue: z.number().nonnegative(),
  platformFee: z.number().nonnegative().default(0),
  hostTax: z.number().nonnegative().default(0),
  otherCharges: z.number().nonnegative().default(0),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the booking details." },
      { status: 400 },
    );
  }

  const { user } = await getCurrentAdminUser();
  const data = parsed.data;
  const checkIn = new Date(`${data.checkIn}T00:00:00.000Z`);
  const checkOut = new Date(`${data.checkOut}T00:00:00.000Z`);

  if (checkOut <= checkIn) {
    return NextResponse.json({ error: "Check-out needs to be after check-in." }, { status: 400 });
  }
  if (data.grossRevenue < data.platformFee + data.hostTax + data.otherCharges) {
    return NextResponse.json({ error: "Deductions cannot be greater than the booking amount." }, { status: 400 });
  }

  const unit = await db.unit.findFirst({
    where: { id: data.unitId, propertyId: data.propertyId },
    select: { id: true },
  });
  if (!unit) {
    return NextResponse.json({ error: "That unit does not belong to the selected property." }, { status: 400 });
  }

  try {
    const result = await createReservation({
      propertyId: data.propertyId,
      unitId: data.unitId,
      checkIn,
      checkOut,
      adults: data.adults,
      children: data.children,
      guest: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      },
      source: data.source,
      userId: user.id,
      financials: {
        grossRevenue: data.grossRevenue,
        platformFee: data.platformFee,
        hostTax: data.hostTax,
        otherCharges: data.otherCharges,
      },
    });

    if (data.status === "CONFIRMED") {
      await confirmReservation(result.reservation.id);
    }

    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: data.status === "CONFIRMED" ? "RESERVATION_CONFIRMED" : "RESERVATION_CREATED",
        entityType: "Reservation",
        entityId: result.reservation.id,
        reservationId: result.reservation.id,
        summary: `${result.reservation.code} added manually for ${data.name}`,
      },
    });

    return NextResponse.json({ id: result.reservation.id, code: result.reservation.code });
  } catch (error) {
    if (error instanceof InventoryConflictError) {
      return NextResponse.json({ error: "Those dates are already booked for this unit." }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "That booking could not be created because a unique record already exists. Try again." }, { status: 409 });
    }
    console.error("Manual booking creation failed", error);
    return NextResponse.json({ error: "Could not create that booking." }, { status: 500 });
  }
}