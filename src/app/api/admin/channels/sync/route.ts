import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { enqueueChannelSync } from "@/lib/queue";

const schema = z.object({ channelPropertyId: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const [{ user }, link] = await Promise.all([
    getCurrentAdminUser(),
    db.channelProperty.findUnique({
      where: { id: parsed.data.channelPropertyId },
      include: { property: { select: { name: true } }, channel: { select: { name: true } } },
    }),
  ]);
  if (!link) {
    return NextResponse.json({ error: "That channel connection no longer exists." }, { status: 404 });
  }
  if (!link.externalListingId) {
    return NextResponse.json(
      { error: "Connect a listing ID before syncing." },
      { status: 400 },
    );
  }

  const job = await enqueueChannelSync({
    channelPropertyId: link.id,
    reason: "MANUAL",
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "CHANNEL_SYNC_REQUESTED",
      entityType: "ChannelProperty",
      entityId: link.id,
      summary: `Manual sync requested for ${link.property.name} → ${link.channel.name}`,
    },
  });

  if (!job) {
    return NextResponse.json(
      { error: "No background worker is configured (REDIS_URL not set) — nothing was queued." },
      { status: 503 },
    );
  }

  return NextResponse.json({ queued: true });
}
