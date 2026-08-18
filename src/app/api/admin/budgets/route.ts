import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { startOfMonthUTC, todayUTC } from "@/lib/dates";

const schema = z.object({
  propertyId: z.string().min(1),
  categoryId: z.string().min(1),
  amount: z.number().positive("Budget must be greater than zero."),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the budget details." },
      { status: 400 },
    );
  }
  const { propertyId, categoryId, amount } = parsed.data;
  const [{ user }, property, category] = await Promise.all([
    getCurrentAdminUser(),
    db.property.findUnique({ where: { id: propertyId }, select: { name: true } }),
    db.transactionCategory.findUnique({ where: { id: categoryId }, select: { name: true } }),
  ]);
  if (!property || !category) {
    return NextResponse.json({ error: "Property or category not found." }, { status: 404 });
  }

  const month = startOfMonthUTC(todayUTC());
  const budget = await db.budget.upsert({
    where: { propertyId_categoryId_month: { propertyId, categoryId, month } },
    create: { propertyId, categoryId, month, amount },
    update: { amount },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "BUDGET_SET",
      entityType: "Budget",
      entityId: budget.id,
      summary: `${property.name} · ${category.name} budget set to ₹${amount} for this month`,
    },
  });

  return NextResponse.json({ id: budget.id });
}
