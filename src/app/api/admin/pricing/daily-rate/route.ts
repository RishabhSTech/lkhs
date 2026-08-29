import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { parseISODate } from "@/lib/dates";
import { enqueueChannelSync } from "@/lib/queue";

const upsertSchema = z.object({
  propertyId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().positive("Enter a price greater than zero."),
});

const deleteSchema = z.object({
  propertyId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

async function syncPropertyChannels(propertyId: string) {
  const links = await db.channelProperty.findMany({
    where: { propertyId, externalListingId: { not: null } },
    select: { id: true },
  });
  await Promise.all(
    links.map((link) => enqueueChannelSync({ channelPropertyId: link.id, reason: "RATE_CHANGED" })),
  );
}

export async function POST(request: Request) {
  const parsed = upsertSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the override details." },
      { status: 400 },
    );
  }
  const { propertyId, date, price } = parsed.data;
  const [{ user }, property] = await Promise.all([
    getCurrentAdminUser(),
    db.property.findUnique({ where: { id: propertyId }, select: { name: true } }),
  ]);
  if (!property) {
    return NextResponse.json({ error: "That property no longer exists." }, { status: 404 });
  }

  const parsedDate = parseISODate(date);
  const override = await db.dailyRate.upsert({
    where: { propertyId_date: { propertyId, date: parsedDate } },
    create: { propertyId, date: parsedDate, price },
    update: { price },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "DAILY_RATE_SET",
      entityType: "DailyRate",
      entityId: override.id,
      summary: `${property.name} · ${date} set to ₹${price}`,
    },
  });

  await syncPropertyChannels(propertyId);

  return NextResponse.json({ id: override.id });
}

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't clear that rate override. Refresh and try again." }, { status: 400 });
  }
  const { propertyId, date } = parsed.data;
  const { user } = await getCurrentAdminUser();

  await db.dailyRate.delete({
    where: { propertyId_date: { propertyId, date: parseISODate(date) } },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "DAILY_RATE_CLEARED",
      entityType: "DailyRate",
      summary: `Override cleared for ${date}`,
    },
  });

  await syncPropertyChannels(propertyId);

  return NextResponse.json({ ok: true });
}
