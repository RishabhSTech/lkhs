import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { alertTeam } from "@/lib/notifications/alert";

const OTA_SOURCES = ["AIRBNB", "BOOKING_COM", "AGODA"] as const;
const OTA_LABELS: Record<(typeof OTA_SOURCES)[number], string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
};

const schema = z.object({
  source: z.enum(OTA_SOURCES),
  guestName: z.string().min(1, "Enter the guest's name."),
  guestEmail: z.email().optional().or(z.literal("")),
  guestPhone: z.string().max(30).optional(),
  body: z.string().min(1, "Paste in what the guest said."),
});

/**
 * Staff paste an Airbnb/Booking.com/Agoda message here the moment they see
 * it on that app — no OTA messaging API exists for us to pull this
 * automatically yet (see /admin/channels), so this is the bridge until one
 * does. It lands in the same unified inbox and fires the same instant alert
 * as a website inquiry.
 */
export async function POST(request: Request) {
  await getCurrentAdminUser();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }
  const { source, guestName, guestEmail, guestPhone, body } = parsed.data;

  const guest = guestEmail
    ? await db.guest.findFirst({ where: { email: guestEmail } })
    : guestPhone
      ? await db.guest.findFirst({ where: { phone: guestPhone } })
      : null;

  const label = OTA_LABELS[source];

  await db.message.create({
    data: {
      guestId: guest?.id ?? null,
      channel: "OTA",
      source,
      direction: "INBOUND",
      subject: `${label} inquiry: ${guestName}`,
      body: guestEmail || guestPhone
        ? `${body}\n\nReply to: ${[guestEmail, guestPhone].filter(Boolean).join(" · ")}`
        : body,
      status: "DELIVERED",
    },
  });

  await alertTeam({
    type: "OTA_MESSAGE",
    title: `New ${label} message`,
    body: `${guestName} — ${body.slice(0, 120)}${body.length > 120 ? "…" : ""}`,
    severity: "WARNING",
    link: "/admin/messages",
  });

  return NextResponse.json({ ok: true });
}
