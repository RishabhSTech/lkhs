import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { guardApi, inScope, outOfScope } from "@/lib/auth/guards";
import { EXTRA_INCOME_ROLES } from "@/lib/auth/roles";
import { formatINR } from "@/lib/format";
import {
  EXTRA_INCOME_CATEGORY, EXTRA_INCOME_LABELS, extraIncomeSchema,
} from "@/lib/finance/extra-income";

export async function POST(request: Request) {
  const parsed = extraIncomeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the details." },
      { status: 400 },
    );
  }
  const auth = await guardApi(EXTRA_INCOME_ROLES, "You don't have permission to record extra income.");
  if ("error" in auth) return auth.error;
  const { user, scope } = auth;
  const data = parsed.data;
  if (!inScope(scope, data.propertyId)) return outOfScope();

  const property = await db.property.findUnique({ where: { id: data.propertyId }, select: { name: true } });
  if (!property) {
    return NextResponse.json({ error: "That property no longer exists. Refresh and pick again." }, { status: 404 });
  }

  const categoryName = EXTRA_INCOME_CATEGORY[data.type];
  const category = await db.transactionCategory.upsert({
    where: { name_group: { name: categoryName, group: "REVENUE" } },
    create: { name: categoryName, group: "REVENUE" },
    update: {},
  });

  const transaction = await db.transaction.create({
    data: {
      propertyId: data.propertyId,
      categoryId: category.id,
      type: "REVENUE",
      amount: new Prisma.Decimal(data.amount),
      date: parseISODate(data.date),
      description: data.description || null,
      paymentMethod: data.paymentMethod,
      status: "PAID",
      createdById: user.id,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "EXTRA_INCOME_CREATED",
      entityType: "Transaction",
      entityId: transaction.id,
      summary: `${property.name} · ${EXTRA_INCOME_LABELS[data.type]} ${formatINR(data.amount)}`,
    },
  });

  return NextResponse.json({ id: transaction.id });
}
