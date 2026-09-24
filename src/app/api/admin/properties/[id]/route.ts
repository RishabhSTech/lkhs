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
  const { name, slug, tagline, description } = parsed.data;
  if (name === undefined && slug === undefined && tagline === undefined && description === undefined) {
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
      summary: `Details updated for ${property.name}`,
    },
  });

  return NextResponse.json({ slug: property.slug });
}
