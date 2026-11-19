import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { getPropertyScope, inScope, outOfScope } from "@/lib/auth/guards";
import { CLEANING_MANAGE_ROLES } from "@/lib/auth/roles";

const schema = z.object({
  name: z.string().trim().min(2, "Enter their name."),
  phone: z.string().trim().min(7, "Enter a phone number they can sign in with.").max(20),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  propertyIds: z.array(z.string().min(1)).max(100).default([]),
});

/**
 * Lets operations add a cleaner without a super admin. Deliberately narrow:
 * it can only create the CLEANER role (the most restricted login), and the
 * properties they look after so turnovers auto-assign to them.
 */
export async function POST(request: Request) {
  const { user } = await getCurrentAdminUser();
  if (!CLEANING_MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Only the operations team can add cleaners." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the details." }, { status: 400 });
  }
  const data = parsed.data;
  const scope = await getPropertyScope(user);
  if (!inScope(scope, ...data.propertyIds)) return outOfScope();
  // An unassigned cleaner would see every property, so scoped managers must
  // give them at least one of their own.
  if (scope && data.propertyIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one property they look after." }, { status: 400 });
  }

  try {
    const member = await db.user.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email?.toLowerCase() || null,
        role: "CLEANER",
        propertyAssignments: data.propertyIds.length
          ? { create: data.propertyIds.map((propertyId) => ({ propertyId })) }
          : undefined,
      },
    });
    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "USER_CREATED",
        entityType: "User",
        entityId: member.id,
        summary: `${member.name} added to the cleaning team`,
      },
    });
    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Someone already uses that phone or email." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "One of those properties no longer exists." }, { status: 400 });
    }
    console.error("Adding cleaner failed", error);
    return NextResponse.json({ error: "Could not add that person." }, { status: 500 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  propertyIds: z.array(z.string().min(1)).max(100),
});

/** Updates which properties a cleaner looks after. */
export async function PATCH(request: Request) {
  const { user } = await getCurrentAdminUser();
  if (!CLEANING_MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Only the operations team can change this." }, { status: 403 });
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the details." }, { status: 400 });
  }
  const member = await db.user.findUnique({ where: { id: parsed.data.id }, select: { role: true, name: true } });
  if (!member || member.role !== "CLEANER") {
    return NextResponse.json({ error: "That person isn't a cleaner." }, { status: 404 });
  }
  // A property-scoped manager can only move a cleaner between their own homes.
  const scope = await getPropertyScope(user);
  if (scope) {
    const current = await db.propertyAssignment.findMany({ where: { userId: parsed.data.id }, select: { propertyId: true } });
    if (!inScope(scope, ...parsed.data.propertyIds, ...current.map((a) => a.propertyId))) return outOfScope();
    if (parsed.data.propertyIds.length === 0) {
      return NextResponse.json({ error: "Pick at least one property they look after." }, { status: 400 });
    }
  }

  await db.$transaction([
    db.propertyAssignment.deleteMany({ where: { userId: parsed.data.id } }),
    db.propertyAssignment.createMany({
      data: parsed.data.propertyIds.map((propertyId) => ({ userId: parsed.data.id, propertyId })),
      skipDuplicates: true,
    }),
  ]);
  return NextResponse.json({ ok: true });
}
