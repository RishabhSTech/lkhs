import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Submits digital check-in for every guest in the party at once - see
 * /checkin/[code] (the form this backs) and ReservationGuest.idType/idNumber/
 * idDocumentUrl. Guests beyond the primary have no existing row (only the
 * primary guest is created at booking time), so this replaces the whole
 * non-primary set on every submit rather than trying to diff it - simpler,
 * and makes a guest correcting a typo just resubmit the same form.
 */
const guestSchema = z.object({
  name: z.string().trim().min(2, "Enter each guest's full name.").max(120),
  idType: z.enum(["AADHAAR", "PASSPORT", "DRIVING_LICENCE", "VOTER_ID", "OTHER"]),
  idNumber: z.string().trim().min(4, "Enter a valid ID number.").max(40),
  idDocumentUrl: z.url().optional().or(z.literal("")),
});

const schema = z.object({
  guests: z.array(guestSchema).min(1).max(16),
});

export async function POST(request: Request, { params }: RouteContext<"/api/checkin/[code]">) {
  const { code } = await params;

  const limited = await checkRateLimit(request, {
    bucket: "checkin-submit",
    limit: 20,
    windowSeconds: 600,
    key: code,
  });
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the guest details and try again." },
      { status: 400 },
    );
  }

  const reservation = await db.reservation.findUnique({
    where: { code },
    select: { id: true, status: true, adults: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "We couldn't find that booking." }, { status: 404 });
  }
  if (reservation.status !== "CONFIRMED" && reservation.status !== "COMPLETED") {
    return NextResponse.json({ error: "This booking isn't ready for check-in yet." }, { status: 409 });
  }

  const { guests } = parsed.data;
  if (guests.length !== reservation.adults) {
    return NextResponse.json(
      {
        error: `This booking has ${reservation.adults} ${reservation.adults === 1 ? "adult" : "adults"} - submit an ID for each.`,
      },
      { status: 400 },
    );
  }

  const [primary, ...rest] = guests;
  const checkedInAt = new Date();

  await db.$transaction(async (tx) => {
    await tx.reservationGuest.updateMany({
      where: { reservationId: reservation.id, isPrimary: true },
      data: {
        name: primary!.name,
        idType: primary!.idType,
        idNumber: primary!.idNumber,
        idDocumentUrl: primary!.idDocumentUrl || null,
        checkedInAt,
      },
    });

    await tx.reservationGuest.deleteMany({
      where: { reservationId: reservation.id, isPrimary: false },
    });

    if (rest.length > 0) {
      await tx.reservationGuest.createMany({
        data: rest.map((guest) => ({
          reservationId: reservation.id,
          name: guest.name,
          idType: guest.idType,
          idNumber: guest.idNumber,
          idDocumentUrl: guest.idDocumentUrl || null,
          isPrimary: false,
          checkedInAt,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true });
}
