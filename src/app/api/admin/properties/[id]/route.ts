import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { sanitizeDescriptionHtml } from "@/lib/property/rich-text";

const patchSchema = z.object({
  name: z.string().min(2, "Give the property a name.").optional(),
  slug: z
    .string()
    .min(1, "Add a slug.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.")
    .optional(),
  tagline: z.string().max(140).nullable().optional(),
  description: z.string().min(20, "Write at least a couple of sentences.").optional(),
  basePrice: z.number().positive("Base price must be greater than zero.").optional(),
  cleaningFee: z.number().min(0).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id: propertyId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the property details." },
      { status: 400 },
    );
  }
  const { name, slug, tagline, description, basePrice, cleaningFee, status } = parsed.data;
  if (
    name === undefined && slug === undefined && tagline === undefined &&
    description === undefined && basePrice === undefined && cleaningFee === undefined &&
    status === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { user } = await getCurrentAdminUser();

  if (slug !== undefined) {
    const existing = await db.property.findUnique({ where: { slug }, select: { id: true } });
    if (existing && existing.id !== propertyId) {
      return NextResponse.json({ error: "That slug is already used by another listing." }, { status: 409 });
    }
  }

  let property;
  try {
    property = await db.property.update({
      where: { id: propertyId },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(tagline !== undefined && { tagline: tagline || null }),
        ...(description !== undefined && { description: sanitizeDescriptionHtml(description) }),
        ...(basePrice !== undefined && { basePrice }),
        ...(cleaningFee !== undefined && { cleaningFee }),
        ...(status !== undefined && { status }),
      },
    });
  } catch (err) {
    // The uniqueness check above is best-effort - this is the actual
    // invariant, for the rare case of two concurrent renames to the same slug.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That slug is already used by another listing." }, { status: 409 });
    }
    throw err;
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PROPERTY_DETAILS_UPDATED",
      entityType: "Property",
      entityId: property.id,
      summary: status !== undefined
        ? `${property.name} status changed to ${status}`
        : `Details updated for ${property.name}`,
    },
  });

  return NextResponse.json({ slug: property.slug });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id: propertyId } = await params;
  const { user } = await getCurrentAdminUser();

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only administrators can delete properties." },
      { status: 403 },
    );
  }

  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, _count: { select: { reservations: true } } },
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }
  if (property._count.reservations > 0) {
    return NextResponse.json(
      { error: "Properties with reservations cannot be deleted. Set it inactive instead." },
      { status: 409 },
    );
  }

  try {
    await db.property.delete({ where: { id: propertyId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "This property is linked to other records and cannot be deleted. Set it inactive instead." },
        { status: 409 },
      );
    }
    throw error;
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PROPERTY_DELETED",
      entityType: "Property",
      entityId: property.id,
      summary: `${property.name} deleted`,
    },
  });

  return NextResponse.json({ id: property.id });
}
