import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

const roleEnum = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "FINANCE",
  "OPERATIONS",
  "CLEANER",
  "MARKETING",
]);

const userPayload = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  phone: z.string().trim().min(7, "Phone must be at least 7 digits.").optional().or(z.literal("")),
  role: roleEnum,
});

const updateUserPayload = userPayload.extend({
  id: z.string().min(1, "User not found."),
});

function normalizeContact(email: string | undefined, phone: string | undefined) {
  const cleanEmail = email?.trim().toLowerCase() || null;
  const cleanPhone = phone?.trim() || null;

  if (!cleanEmail && !cleanPhone) {
    throw new Error("Add either an email or phone number.");
  }

  return {
    email: cleanEmail,
    phone: cleanPhone,
  };
}

export async function GET() {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can manage users." }, { status: 403 });
  }

  const members = await db.user.findMany({
    include: { propertyAssignments: { include: { property: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can add users." }, { status: 403 });
  }

  const parsed = userPayload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the user details." }, { status: 400 });
  }

  try {
    const { email, phone } = normalizeContact(parsed.data.email, parsed.data.phone);
    const member = await db.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone,
        role: parsed.data.role,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "USER_CREATED",
        entityType: "User",
        entityId: member.id,
        summary: `${member.name} added as ${member.role.replace(/_/g, " ").toLowerCase()}`,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A user with that email or phone already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create the user." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Only super admins can update users." }, { status: 403 });
  }

  const parsed = updateUserPayload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the user details." }, { status: 400 });
  }

  try {
    const { email, phone } = normalizeContact(parsed.data.email, parsed.data.phone);
    const member = await db.user.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        email,
        phone,
        role: parsed.data.role,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "USER_UPDATED",
        entityType: "User",
        entityId: member.id,
        summary: `${member.name} updated to ${member.role.replace(/_/g, " ").toLowerCase()}`,
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A user with that email or phone already exists." }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update the user." }, { status: 400 });
  }
}
