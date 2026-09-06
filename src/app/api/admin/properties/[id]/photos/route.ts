import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

const createSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(200).optional(),
});

const reorderSchema = z.object({
  order: z.array(z.string().min(1)).min(1),
});

const deleteSchema = z.object({ imageId: z.string().min(1) });

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id: propertyId } = await params;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't add that photo - check the file and try again." }, { status: 400 });
  }

  const [{ user }, count] = await Promise.all([
    getCurrentAdminUser(),
    db.propertyImage.count({ where: { propertyId } }),
  ]);

  const image = await db.propertyImage.create({
    data: {
      propertyId,
      url: parsed.data.url,
      alt: parsed.data.alt ?? null,
      sortOrder: count,
      isHero: count === 0,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PROPERTY_PHOTO_ADDED",
      entityType: "PropertyImage",
      entityId: image.id,
      summary: `Photo added to property ${propertyId}`,
    },
  });

  return NextResponse.json({ id: image.id });
}

/** Reorders every photo in one shot - `order` is the full list of image ids
 * in their new sequence, so index 0 becomes the hero. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id: propertyId } = await params;
  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't save that photo order. Refresh and try again." }, { status: 400 });
  }

  await db.$transaction(
    parsed.data.order.map((imageId, index) =>
      db.propertyImage.update({
        where: { id: imageId, propertyId },
        data: { sortOrder: index, isHero: index === 0 },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id: propertyId } = await params;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't remove that photo. Refresh and try again." }, { status: 400 });
  }

  const { user } = await getCurrentAdminUser();
  await db.propertyImage.delete({ where: { id: parsed.data.imageId, propertyId } });

  // If the hero was the one just removed, promote whichever photo is first now.
  const remaining = await db.propertyImage.findMany({
    where: { propertyId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, isHero: true },
  });
  if (remaining.length > 0 && !remaining.some((img) => img.isHero)) {
    await db.propertyImage.update({ where: { id: remaining[0].id }, data: { isHero: true } });
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PROPERTY_PHOTO_REMOVED",
      entityType: "PropertyImage",
      summary: `Photo removed from property ${propertyId}`,
    },
  });

  return NextResponse.json({ ok: true });
}
