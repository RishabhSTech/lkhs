import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

const linkSchema = z.object({
  channelCode: z.enum(["WEBSITE", "AIRBNB", "BOOKING_COM", "AGODA"]),
  propertyId: z.string().min(1),
  externalListingId: z.string().max(120),
});

const unlinkSchema = z.object({
  channelCode: z.enum(["WEBSITE", "AIRBNB", "BOOKING_COM", "AGODA"]),
  propertyId: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = linkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the connection details — something there isn't right." }, { status: 400 });
  }
  const { channelCode, propertyId, externalListingId } = parsed.data;

  const [{ user }, channel, property] = await Promise.all([
    getCurrentAdminUser(),
    db.channel.findUnique({ where: { code: channelCode } }),
    db.property.findUnique({ where: { id: propertyId }, select: { name: true } }),
  ]);
  if (!channel || !property) {
    return NextResponse.json({ error: "That channel or property no longer exists. Refresh and try again." }, { status: 404 });
  }

  const unit = await db.unit.findFirst({ where: { propertyId }, select: { id: true } });

  // DISCONNECTED, not CONNECTED: the mapping is saved, but no credentials are
  // live, so claiming a connection here would be a lie.
  const link = await db.channelProperty.upsert({
    where: { channelId_propertyId: { channelId: channel.id, propertyId } },
    create: {
      channelId: channel.id,
      propertyId,
      externalListingId: externalListingId || null,
      status: externalListingId ? "DISCONNECTED" : "NOT_CONFIGURED",
      ...(unit ? { rooms: { create: { unitId: unit.id } } } : {}),
    },
    update: {
      externalListingId: externalListingId || null,
      status: externalListingId ? "DISCONNECTED" : "NOT_CONFIGURED",
    },
  });

  await db.channelSyncLog.create({
    data: {
      channelPropertyId: link.id,
      direction: "PUSH",
      status: "ERROR",
      message: `Listing mapped, but ${channel.name} API access is not configured — nothing has been synced yet.`,
      finishedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CHANNEL_LINKED",
      entityType: "ChannelProperty",
      entityId: link.id,
      summary: `${property.name} linked to ${channel.name} (${externalListingId || "no listing ID"})`,
    },
  });

  return NextResponse.json({ id: link.id, status: link.status });
}

export async function DELETE(request: Request) {
  const parsed = unlinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't unlink that property. Refresh and try again." }, { status: 400 });
  }
  const { channelCode, propertyId } = parsed.data;

  const [{ user }, channel, property] = await Promise.all([
    getCurrentAdminUser(),
    db.channel.findUnique({ where: { code: channelCode } }),
    db.property.findUnique({ where: { id: propertyId }, select: { name: true } }),
  ]);
  if (!channel || !property) {
    return NextResponse.json({ error: "That link no longer exists." }, { status: 404 });
  }

  await db.channelProperty.updateMany({
    where: { channelId: channel.id, propertyId },
    data: { externalListingId: null, status: "NOT_CONFIGURED", lastSyncAt: null },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CHANNEL_UNLINKED",
      entityType: "ChannelProperty",
      summary: `${property.name} unlinked from ${channel.name}`,
    },
  });

  return NextResponse.json({ ok: true });
}
