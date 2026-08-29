import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { HIGHLIGHT_BY_CODE, type HighlightCode } from "@/lib/property/highlights";
import { THING_TO_KNOW_BY_CODE } from "@/lib/property/things-to-know";

const schema = z.object({
  isGuestFavourite: z.boolean(),
  checkInFrom: z.string().max(20).nullable(),
  checkInTo: z.string().max(20).nullable(),
  checkOutBy: z.string().max(20).nullable(),
  amenities: z
    .array(
      z.object({
        amenityId: z.string().min(1),
        isUnavailable: z.boolean().default(false),
        note: z.string().max(120).nullable().default(null),
      }),
    )
    .max(200),
  highlights: z
    .array(
      z.object({
        code: z.string().min(1),
        subtitle: z.string().max(200).nullable().default(null),
      }),
    )
    // Airbnb shows three; more than six stops being a highlight reel.
    .max(6),
  thingsToKnow: z
    .array(
      z.object({
        group: z.enum(["HOUSE_RULES", "SAFETY_PROPERTY", "CANCELLATION"]),
        code: z.string().min(1),
        label: z.string().min(1).max(200),
      }),
    )
    .max(80),
});

/**
 * Replaces a listing's selectable content in one shot: the amenities ticked,
 * the highlights chosen, and the "Things to know" items.
 *
 * A wholesale replace inside one transaction is deliberate — the editor sends
 * the complete state of each list, so a partial diff would only add a way for
 * the page and the form to disagree.
 */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/admin/properties/[id]/listing">,
) {
  const { id } = await params;
  const { user } = await getCurrentAdminUser();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the listing details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const property = await db.property.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
  if (!property) {
    return NextResponse.json({ error: "That property no longer exists." }, { status: 404 });
  }

  // Unknown codes are dropped rather than stored: a row whose code no longer
  // resolves would render as a blank bullet on the listing.
  const highlights = data.highlights.filter((h) =>
    HIGHLIGHT_BY_CODE.has(h.code as HighlightCode),
  );
  const thingsToKnow = data.thingsToKnow.filter(
    (t) => t.code === "CUSTOM" || THING_TO_KNOW_BY_CODE.has(t.code),
  );

  const amenityIds = [...new Set(data.amenities.map((a) => a.amenityId))];
  const known = await db.amenity.findMany({
    where: { id: { in: amenityIds } },
    select: { id: true },
  });
  const knownIds = new Set(known.map((a) => a.id));
  const amenities = data.amenities.filter((a) => knownIds.has(a.amenityId));

  await db.$transaction([
    db.property.update({
      where: { id },
      data: {
        isGuestFavourite: data.isGuestFavourite,
        checkInFrom: data.checkInFrom?.trim() || null,
        checkInTo: data.checkInTo?.trim() || null,
        checkOutBy: data.checkOutBy?.trim() || null,
      },
    }),
    db.propertyAmenity.deleteMany({ where: { propertyId: id } }),
    db.propertyAmenity.createMany({
      data: amenities.map((a) => ({
        propertyId: id,
        amenityId: a.amenityId,
        isUnavailable: a.isUnavailable,
        note: a.note?.trim() || null,
      })),
    }),
    db.propertyHighlight.deleteMany({ where: { propertyId: id } }),
    db.propertyHighlight.createMany({
      data: highlights.map((h, sortOrder) => ({
        propertyId: id,
        code: h.code,
        subtitle: h.subtitle?.trim() || null,
        sortOrder,
      })),
    }),
    db.propertyThingToKnow.deleteMany({ where: { propertyId: id } }),
    db.propertyThingToKnow.createMany({
      data: thingsToKnow.map((t, sortOrder) => ({
        propertyId: id,
        group: t.group,
        code: t.code,
        label: t.label.trim(),
        sortOrder,
      })),
    }),
    db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "LISTING_UPDATED",
        entityType: "Property",
        entityId: id,
        summary: `${property.name} — ${amenities.length} amenities, ${highlights.length} highlights`,
        metadata: {
          amenities: amenities.length,
          highlights: highlights.length,
          thingsToKnow: thingsToKnow.length,
        },
      },
    }),
  ]);

  revalidatePath(`/stays/${property.slug}`);

  return NextResponse.json({
    amenities: amenities.length,
    highlights: highlights.length,
    thingsToKnow: thingsToKnow.length,
  });
}
