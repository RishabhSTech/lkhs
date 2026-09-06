import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import {
  InventoryConflictError,
  PaymentIntentError,
  createReservation,
} from "@/lib/booking/create-reservation";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  propertySlug: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(16),
  name: z.string().min(2, "Please enter your full name."),
  email: z.email("Enter a valid email address.").optional().or(z.literal("")),
  phone: z.string().min(8, "Enter a valid mobile number.").optional().or(z.literal("")),
  paymentMethod: z.enum(["UPI", "CARD", "NETBANKING", "OTHER"]).default("UPI"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the booking details." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (!data.email && !data.phone) {
    return NextResponse.json(
      { error: "We need an email address or a mobile number to send your confirmation to." },
      { status: 400 },
    );
  }

  const property = await db.property.findUnique({
    where: { slug: data.propertySlug },
    select: { id: true },
  });
  if (!property) {
    return NextResponse.json({ error: "That home is no longer listed." }, { status: 404 });
  }

  const session = await getSession();

  try {
    const { reservation, status, clientCheckout } = await createReservation({
      propertyId: property.id,
      checkIn: parseISODate(data.checkIn),
      checkOut: parseISODate(data.checkOut),
      adults: data.guests,
      guest: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      },
      source: "DIRECT",
      paymentMethod: data.paymentMethod,
      userId: session?.userId ?? null,
    });

    return NextResponse.json({
      code: reservation.code,
      id: reservation.id,
      status,
      clientCheckout: clientCheckout ?? null,
    });
  } catch (error) {
    if (error instanceof InventoryConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof PaymentIntentError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    console.error("Booking failed", error);
    return NextResponse.json(
      { error: "We couldn't complete that booking. Nothing has been charged - try again, or message us and we'll hold the dates." },
      { status: 500 },
    );
  }
}
