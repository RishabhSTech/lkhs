import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardApi, inScope, outOfScope } from "@/lib/auth/guards";
import { INVENTORY_ROLES } from "@/lib/auth/roles";
import { enqueueChannelSync } from "@/lib/queue";

const schema = z.object({ channelPropertyId: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't start that sync. Refresh and try again." }, { status: 400 });
  }

  const auth = await guardApi(INVENTORY_ROLES);
  if ("error" in auth) return auth.error;
  const { user, scope } = auth;
  const [link] = await Promise.all([
    db.channelProperty.findUnique({
      where: { id: parsed.data.channelPropertyId },
      include: { property: { select: { name: true } }, channel: { select: { name: true } } },
    }),
  ]);
  if (link && !inScope(scope, link.propertyId)) return outOfScope();
  if (!link) {
    return NextResponse.json({ error: "That channel connection no longer exists." }, { status: 404 });
  }
  if (!link.externalListingId) {
    return NextResponse.json(
      { error: "Add the channel's listing ID before syncing - there's nothing to sync against without it." },
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
      { error: "No background worker is running, so nothing was queued. Set REDIS_URL and start the worker." },
      { status: 503 },
    );
  }

  return NextResponse.json({ queued: true });
}
