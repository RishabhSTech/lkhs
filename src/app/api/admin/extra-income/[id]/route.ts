import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { guardApi, inScope, outOfScope } from "@/lib/auth/guards";
import { EXTRA_INCOME_ROLES } from "@/lib/auth/roles";
import { formatINR } from "@/lib/format";
import {
  EXTRA_INCOME_CATEGORY, EXTRA_INCOME_CATEGORY_NAMES, EXTRA_INCOME_LABELS, extraIncomeSchema,
  extraIncomeTypeOf,
} from "@/lib/finance/extra-income";

/** Only standalone extra-income entries - never a booking's own revenue. */
async function load(id: string) {
  const auth = await guardApi(EXTRA_INCOME_ROLES, "You don't have permission to change extra income.");
  if ("error" in auth) return { error: auth.error };
  const entry = await db.transaction.findFirst({
    where: {
      id,
      type: "REVENUE",
      reservationId: null,
      category: { name: { in: EXTRA_INCOME_CATEGORY_NAMES } },
    },
    include: { property: { select: { name: true } }, category: { select: { name: true } } },
  });
  if (!entry) {
    return { error: NextResponse.json({ error: "That entry no longer exists." }, { status: 404 }) };
  }
  if (!inScope(auth.scope, entry.propertyId)) return { error: outOfScope() };
  return { user: auth.user, scope: auth.scope, entry };
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/extra-income/[id]">) {
  const { id } = await params;
  const parsed = extraIncomeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the details." },
      { status: 400 },
    );
  }
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  const { user, scope } = loaded;
  const data = parsed.data;
  if (!inScope(scope, data.propertyId)) return outOfScope();

  const property = await db.property.findUnique({ where: { id: data.propertyId }, select: { name: true } });
  if (!property) {
    return NextResponse.json({ error: "That property no longer exists." }, { status: 404 });
  }
  const categoryName = EXTRA_INCOME_CATEGORY[data.type];
  const category = await db.transactionCategory.upsert({
    where: { name_group: { name: categoryName, group: "REVENUE" } },
    create: { name: categoryName, group: "REVENUE" },
    update: {},
  });

  await db.transaction.update({
    where: { id },
    data: {
      propertyId: data.propertyId,
      categoryId: category.id,
      amount: new Prisma.Decimal(data.amount),
      date: parseISODate(data.date),
      description: data.description || null,
      paymentMethod: data.paymentMethod,
    },
  });
  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "EXTRA_INCOME_UPDATED",
      entityType: "Transaction",
      entityId: id,
      summary: `${property.name} · ${EXTRA_INCOME_LABELS[data.type]} ${formatINR(data.amount)} edited`,
    },
  });
  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/admin/extra-income/[id]">) {
  const { id } = await params;
  const loaded = await load(id);
  if ("error" in loaded) return loaded.error;
  const { user, entry } = loaded;
  const type = extraIncomeTypeOf(entry.category.name);

  await db.$transaction([
    db.transaction.delete({ where: { id } }),
    db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "EXTRA_INCOME_DELETED",
        entityType: "Transaction",
        entityId: id,
        summary: `${entry.property.name} · ${type ? EXTRA_INCOME_LABELS[type] : entry.category.name} ${formatINR(Number(entry.amount))} deleted`,
      },
    }),
  ]);
  return NextResponse.json({ deleted: true });
}
