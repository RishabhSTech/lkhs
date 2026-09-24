import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { updateReservation, InventoryConflictError } from "@/lib/booking/create-reservation";

const schema = z.object({
  propertyId: z.string().min(1),
  unitId: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(16),
  children: z.number().int().min(0).max(16),
  name: z.string().min(2, "Enter the guest name."),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().min(8, "Enter a valid phone number.").optional().or(z.literal("")),
  source: z.enum(["DIRECT", "AIRBNB", "BOOKING_COM", "AGODA", "OTHER"]),
  grossRevenue: z.number().nonnegative(),
  platformFee: z.number().nonnegative(),
  hostTax: z.number().nonnegative(),
  otherCharges: z.number().nonnegative(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the booking details." }, { status: 400 });
  }
  const data = parsed.data;
  if (data.grossRevenue < data.platformFee + data.hostTax + data.otherCharges) {
    return NextResponse.json({ error: "Deductions cannot be greater than the booking amount." }, { status: 400 });
  }

  const { user } = await getCurrentAdminUser();
  try {
    const reservation = await updateReservation({
      reservationId: id,
      propertyId: data.propertyId,
      unitId: data.unitId,
      checkIn: new Date(`${data.checkIn}T00:00:00.000Z`),
      checkOut: new Date(`${data.checkOut}T00:00:00.000Z`),
      adults: data.adults,
      children: data.children,
      guest: { name: data.name, email: data.email || null, phone: data.phone || null },
      source: data.source,
      financials: {
        grossRevenue: data.grossRevenue,
        platformFee: data.platformFee,
        hostTax: data.hostTax,
        otherCharges: data.otherCharges,
      },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "RESERVATION_UPDATED",
        entityType: "Reservation",
        entityId: reservation.id,
        reservationId: reservation.id,
        summary: `${reservation.code} updated by ${user.name}`,
      },
    });
    return NextResponse.json({ id: reservation.id });
  } catch (error) {
    if (error instanceof InventoryConflictError) {
      return NextResponse.json({ error: "Those dates are already booked for this unit." }, { status: 409 });
    }
    if (error instanceof Error && (error.message.includes("cannot be edited") || error.message.includes("does not belong"))) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Reservation update failed", error);
    return NextResponse.json({ error: "Could not update that booking." }, { status: 500 });
  }
}