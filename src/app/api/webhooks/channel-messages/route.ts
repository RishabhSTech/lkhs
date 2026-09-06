import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { alertTeam } from "@/lib/notifications/alert";

const OTA_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
};

const schema = z.object({
  source: z.enum(["AIRBNB", "BOOKING_COM", "AGODA"]),
  guestName: z.string().min(1),
  guestEmail: z.email().optional(),
  guestPhone: z.string().max(30).optional(),
  message: z.string().min(1),
  // Dedupe key from the upstream platform, so retried webhook deliveries
  // don't create duplicate inbox entries. Optional because not every
  // aggregator's payload includes one.
  externalMessageId: z.string().optional(),
});

/**
 * Generic inbound webhook for a future channel-manager subscription (Beds24,
 * Hostaway, etc.) — none of Airbnb/Booking.com/Agoda offer a self-serve
 * messaging API to individual hosts, so nothing calls this yet. It exists so
 * that once you do subscribe to an aggregator, wiring their outbound webhook
 * here is the only integration work left: same unified inbox, same instant
 * alert as every other channel.
 *
 * Auth: shared secret in `x-webhook-secret`, matched against
 * CHANNEL_WEBHOOK_SECRET. Unset secret = reject everything, not "open".
 */
export async function POST(request: Request) {
  const expected = process.env.CHANNEL_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }
  if (request.headers.get("x-webhook-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const { source, guestName, guestEmail, guestPhone, message, externalMessageId } = parsed.data;

  if (externalMessageId) {
    const dupe = await db.message.findFirst({
      where: { subject: { contains: externalMessageId } },
      select: { id: true },
    });
    if (dupe) return NextResponse.json({ ok: true, duplicate: true });
  }

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
      subject: `${label} inquiry: ${guestName}${externalMessageId ? ` [${externalMessageId}]` : ""}`,
      body: guestEmail || guestPhone
        ? `${message}\n\nReply to: ${[guestEmail, guestPhone].filter(Boolean).join(" · ")}`
        : message,
      status: "DELIVERED",
    },
  });

  await alertTeam({
    type: "OTA_MESSAGE",
    title: `New ${label} message`,
    body: `${guestName} — ${message.slice(0, 120)}${message.length > 120 ? "…" : ""}`,
    severity: "WARNING",
    link: "/admin/messages",
  });

  return NextResponse.json({ ok: true });
}
