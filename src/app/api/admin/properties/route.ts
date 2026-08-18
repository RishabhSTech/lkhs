import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

const schema = z.object({
  name: z.string().min(2, "Give the property a name."),
  propertyType: z.enum(["VILLA", "APARTMENT", "HOME", "COTTAGE"]),
  locationArea: z.string().min(2, "Enter the locality."),
  city: z.string().min(2).default("Indore"),
  state: z.string().min(2).default("Madhya Pradesh"),
  addressLine: z.string().min(5, "Enter the full address."),
  description: z.string().min(20, "Write at least a couple of sentences."),
  tagline: z.string().max(140).optional(),
  maxGuests: z.number().int().min(1),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  beds: z.number().int().min(1),
  basePrice: z.number().positive("Base price must be greater than zero."),
  cleaningFee: z.number().min(0).default(0),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the property details." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const { user } = await getCurrentAdminUser();

  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await db.property.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const property = await db.property.create({
    data: {
      slug,
      name: data.name,
      tagline: data.tagline || null,
      description: data.description,
      locationArea: data.locationArea,
      city: data.city,
      state: data.state,
      addressLine: data.addressLine,
      propertyType: data.propertyType,
      status: "INACTIVE", // goes live once photos + amenities are filled in via the listing editor
      maxGuests: data.maxGuests,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      beds: data.beds,
      basePrice: data.basePrice,
      cleaningFee: data.cleaningFee,
      units: {
        create: {
          name: "Whole property",
          maxGuests: data.maxGuests,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          beds: data.beds,
        },
      },
      channelProperties: {
        create: { channel: { connect: { code: "WEBSITE" } }, status: "CONNECTED" },
      },
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "PROPERTY_CREATED",
      entityType: "Property",
      entityId: property.id,
      summary: `${property.name} added to the portfolio (inactive until listing is complete)`,
    },
  });

  return NextResponse.json({ id: property.id, slug: property.slug });
}
