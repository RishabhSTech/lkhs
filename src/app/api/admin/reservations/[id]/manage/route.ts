import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardApi, inScope, outOfScope } from "@/lib/auth/guards";
import { BOOKING_WRITE_ROLES } from "@/lib/auth/roles";
import { todayUTC } from "@/lib/dates";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("notes"), internalNotes: z.string().max(2000) }),
  z.object({ action: z.literal("status"), status: z.enum(["COMPLETED", "NO_SHOW", "CONFIRMED"]) }),
]);

/**
 * Small day-to-day edits on a booking that don't touch dates or money:
 * internal notes, and closing out a stay as completed or a no-show (or
 * undoing that by mistake).
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/admin/reservations/[id]/manage">,
) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't read that change. Try again." }, { status: 400 });
  }
  const auth = await guardApi(BOOKING_WRITE_ROLES, "You don't have permission to change bookings.");
  if ("error" in auth) return auth.error;
  const { user, scope } = auth;

  const reservation = await db.reservation.findUnique({
    where: { id },
    select: { id: true, code: true, status: true, checkIn: true, propertyId: true },
  });
  if (!reservation) {
    return NextResponse.json({ error: "That booking no longer exists." }, { status: 404 });
  }
  if (!inScope(scope, reservation.propertyId)) return outOfScope();

  const body = parsed.data;

  if (body.action === "notes") {
    await db.reservation.update({
      where: { id },
      data: { internalNotes: body.internalNotes.trim() || null },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "RESERVATION_NOTES_UPDATED",
        entityType: "Reservation",
        entityId: id,
        reservationId: id,
        summary: `${reservation.code} notes updated by ${user.name}`,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const allowed: Record<string, string[]> = {
    COMPLETED: ["CONFIRMED", "NO_SHOW"],
    NO_SHOW: ["CONFIRMED", "COMPLETED"],
    CONFIRMED: ["COMPLETED", "NO_SHOW"],
  };
  if (!allowed[body.status].includes(reservation.status)) {
    return NextResponse.json(
      { error: `A ${reservation.status.toLowerCase()} booking can't be marked ${body.status.toLowerCase().replace("_", "-")}.` },
      { status: 409 },
    );
  }
  if (body.status !== "CONFIRMED" && reservation.checkIn > todayUTC()) {
    return NextResponse.json(
      { error: "This stay hasn't started yet - you can close it out from the check-in date." },
      { status: 409 },
    );
  }

  await db.reservation.update({ where: { id }, data: { status: body.status } });
  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "RESERVATION_STATUS_CHANGED",
      entityType: "Reservation",
      entityId: id,
      reservationId: id,
      summary: `${reservation.code} marked ${body.status.toLowerCase().replace("_", "-")} by ${user.name}`,
    },
  });
  return NextResponse.json({ status: body.status });
}
