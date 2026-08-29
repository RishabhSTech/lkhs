import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseISODate, startOfMonthUTC } from "@/lib/dates";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { formatINR } from "@/lib/format";

const schema = z.object({
  propertyId: z.string().min(1),
  categoryId: z.string().min(1),
  amount: z.number().positive("Amount must be greater than zero."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  frequency: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]).default("ONE_TIME"),
  description: z.string().max(300).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).default("BANK_TRANSFER"),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "APPROVED"]).default("PAID"),
  receiptUrl: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the expense details." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const [{ user }, category, property] = await Promise.all([
    getCurrentAdminUser(),
    db.transactionCategory.findUnique({ where: { id: data.categoryId } }),
    db.property.findUnique({ where: { id: data.propertyId } }),
  ]);

  if (!category || !property) {
    return NextResponse.json(
      { error: "That property or expense category no longer exists. Refresh and pick again." },
      { status: 404 },
    );
  }

  // The category's group decides the transaction type, so refundable deposits
  // and setup capital never get counted as operating expenses.
  const type =
    category.group === "INITIAL_INVESTMENT"
      ? "INVESTMENT"
      : category.isRefundableDeposit
        ? "DEPOSIT_OUT"
        : "EXPENSE";

  const transaction = await db.transaction.create({
    data: {
      propertyId: data.propertyId,
      categoryId: data.categoryId,
      type,
      amount: new Prisma.Decimal(data.amount),
      date: parseISODate(data.date),
      description: data.description || `${category.name} — ${property.name}`,
      paymentMethod: data.paymentMethod,
      status: data.status,
      frequency: data.frequency,
      receiptUrl: data.receiptUrl || null,
      createdById: user.id,
    },
  });

  if (data.frequency !== "ONE_TIME") {
    await db.recurringExpense.create({
      data: {
        propertyId: data.propertyId,
        categoryId: data.categoryId,
        amount: new Prisma.Decimal(data.amount),
        frequency: data.frequency,
        dayOfMonth: parseISODate(data.date).getUTCDate(),
        description: data.description || category.name,
        startDate: parseISODate(data.date),
        nextRunDate: startOfMonthUTC(
          new Date(
            Date.UTC(
              parseISODate(data.date).getUTCFullYear(),
              parseISODate(data.date).getUTCMonth() + 1,
              1,
            ),
          ),
        ),
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "EXPENSE_CREATED",
      entityType: "Transaction",
      entityId: transaction.id,
      summary: `${property.name} · ${category.name} ${formatINR(data.amount)}`,
      metadata: { amount: data.amount, categoryId: data.categoryId },
    },
  });

  return NextResponse.json({ id: transaction.id });
}
