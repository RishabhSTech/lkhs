import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

const schema = z.object({
  propertySlug: z.string().min(1),
  saved: z.boolean(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to keep this home for later." },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "We couldn't save that. Refresh the page and try again." }, { status: 400 });
  }

  const [guest, property] = await Promise.all([
    db.guest.findFirst({ where: { userId: session.userId } }),
    db.property.findUnique({
      where: { slug: parsed.data.propertySlug },
      select: { id: true },
    }),
  ]);

  if (!property) {
    return NextResponse.json({ error: "That home is no longer listed." }, { status: 404 });
  }

  // A guest profile is created on first save for users who haven't booked yet.
  const guestRecord =
    guest ??
    (await db.guest.create({
      data: {
        userId: session.userId,
        name: session.name,
        email: session.email ?? null,
        phone: session.phone ?? null,
      },
    }));

  if (parsed.data.saved) {
    await db.wishlist.upsert({
      where: {
        guestId_propertyId: { guestId: guestRecord.id, propertyId: property.id },
      },
      create: { guestId: guestRecord.id, propertyId: property.id },
      update: {},
    });
  } else {
    await db.wishlist.deleteMany({
      where: { guestId: guestRecord.id, propertyId: property.id },
    });
  }

  return NextResponse.json({ saved: parsed.data.saved });
}
