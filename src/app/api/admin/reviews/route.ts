import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { parseISODate } from "@/lib/dates";
import { REVIEW_TOPIC_BY_CODE } from "@/lib/property/review-topics";

const score = z.number().int().min(1).max(5);

const createSchema = z.object({
  propertyId: z.string().min(1),
  rating: score,
  cleanliness: score.nullish(),
  accuracy: score.nullish(),
  checkIn: score.nullish(),
  communication: score.nullish(),
  location: score.nullish(),
  value: score.nullish(),
  topics: z.array(z.string()).max(5).optional(),
  title: z.string().max(80).nullish(),
  body: z.string().min(10).max(2000),
  nightsStayed: z.number().int().min(1).max(365).nullish(),
  stayedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  tripType: z
    .enum(["SOLO", "COUPLE", "FAMILY", "FRIENDS", "BUSINESS", "GROUP"])
    .nullish(),
  source: z
    .enum(["DIRECT", "AIRBNB", "BOOKING_COM", "AGODA", "GOOGLE", "OTHER"])
    .default("OTHER"),
  status: z.enum(["PENDING", "PUBLISHED", "HIDDEN"]).default("PUBLISHED"),
  authorName: z.string().min(1).max(80),
  authorLocation: z.string().max(80).nullish(),
  authorSince: z.number().int().min(2000).max(2100).nullish(),
  isFeatured: z.boolean().default(false),
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PENDING", "PUBLISHED", "HIDDEN"]).optional(),
  response: z.string().max(1000).nullish(),
  isFeatured: z.boolean().optional(),
});

async function revalidateListing(propertyId: string) {
  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { slug: true },
  });
  if (property) revalidatePath(`/stays/${property.slug}`);
}

/**
 * An admin entering a review by hand - typically one imported from an OTA,
 * where there is no guest or reservation of ours behind it. Those carry their
 * own author fields and a typed-in stay length, and never claim to be a
 * verified stay on the listing.
 */
export async function POST(request: Request) {
  const { user } = await getCurrentAdminUser();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the review details." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const property = await db.property.findUnique({
    where: { id: data.propertyId },
    select: { id: true, name: true, slug: true },
  });
  if (!property) {
    return NextResponse.json({ error: "That property no longer exists." }, { status: 404 });
  }

  const review = await db.review.create({
    data: {
      propertyId: property.id,
      rating: data.rating,
      cleanliness: data.cleanliness ?? null,
      accuracy: data.accuracy ?? null,
      checkIn: data.checkIn ?? null,
      communication: data.communication ?? null,
      location: data.location ?? null,
      value: data.value ?? null,
      topics: (data.topics ?? []).filter((code) =>
        REVIEW_TOPIC_BY_CODE.has(code),
      ),
      title: data.title?.trim() || null,
      body: data.body.trim(),
      nightsStayed: data.nightsStayed ?? null,
      stayedOn: data.stayedOn ? parseISODate(data.stayedOn) : null,
      tripType: data.tripType ?? null,
      source: data.source,
      status: data.status,
      isFeatured: data.isFeatured,
      authorName: data.authorName.trim(),
      authorLocation: data.authorLocation?.trim() || null,
      authorSince: data.authorSince ?? null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "REVIEW_IMPORTED",
      entityType: "Review",
      entityId: review.id,
      summary: `${property.name} - ${data.rating}★ from ${data.authorName}`,
      metadata: { source: data.source, rating: data.rating },
    },
  });

  revalidatePath(`/stays/${property.slug}`);

  return NextResponse.json({ id: review.id });
}

/** Moderation: publish, hide, feature, or reply to an existing review. */
export async function PATCH(request: Request) {
  const { user } = await getCurrentAdminUser();

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't update that review - check the values and try again." }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await db.review.findUnique({
    where: { id: data.id },
    select: { id: true, propertyId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "That review no longer exists." }, { status: 404 });
  }

  const response = data.response?.trim() || null;

  const review = await db.review.update({
    where: { id: data.id },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
      ...(data.response !== undefined
        ? { response, respondedAt: response ? new Date() : null }
        : {}),
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: data.response !== undefined ? "REVIEW_REPLIED" : "REVIEW_MODERATED",
      entityType: "Review",
      entityId: review.id,
      summary:
        data.response !== undefined
          ? "Replied to a guest review"
          : `Review set to ${review.status.toLowerCase()}`,
    },
  });

  await revalidateListing(existing.propertyId);

  return NextResponse.json({ id: review.id, status: review.status });
}

export async function DELETE(request: Request) {
  const { user } = await getCurrentAdminUser();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "We couldn't tell which review that was." }, { status: 400 });
  }

  const existing = await db.review.findUnique({
    where: { id },
    select: { id: true, propertyId: true, guestId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "That review no longer exists." }, { status: 404 });
  }
  // A guest's own review is hidden, never deleted - deleting it would let a
  // bad review be made to disappear with no trace and no way back.
  if (existing.guestId) {
    return NextResponse.json(
      { error: "Guest reviews can be hidden, but never deleted - hide it instead." },
      { status: 409 },
    );
  }

  await db.review.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "REVIEW_DELETED",
      entityType: "Review",
      entityId: id,
      summary: "Deleted an imported review",
    },
  });

  await revalidateListing(existing.propertyId);

  return NextResponse.json({ ok: true });
}
