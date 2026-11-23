import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isOwnStorageUrl } from "@/lib/storage/s3";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { getPropertyScope, inScope, outOfScope } from "@/lib/auth/guards";
import { EXPENSE_SUBMIT_ROLES, FINANCE_ROLES } from "@/lib/auth/roles";
import { formatINR } from "@/lib/format";
import { PAYER_LABELS, PAYER_VALUES } from "@/lib/finance/payers";

const EXPENSE_TYPES = ["EXPENSE", "INVESTMENT", "DEPOSIT_OUT"] as const;

const patchSchema = z.object({
  propertyId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  amount: z.number().positive("Amount must be greater than zero.").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().max(300).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).optional(),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "APPROVED"]).optional(),
  receiptUrl: z.string().refine(isOwnStorageUrl, "Attach the receipt again.").nullable().optional(),
  paidBy: z.enum(PAYER_VALUES).nullable().optional(),
  /** Finance only: true marks the payer as paid back, false undoes it. */
  reimbursed: z.boolean().optional(),
});

/**
 * Finance can change any expense. Whoever logged an expense can still fix or
 * withdraw it while it's waiting for approval - after that it's on the books
 * and only finance touches it.
 */
async function loadForWrite(id: string) {
  const { user } = await getCurrentAdminUser();
  if (!EXPENSE_SUBMIT_ROLES.includes(user.role)) {
    return { error: NextResponse.json({ error: "You don't have permission to change expenses." }, { status: 403 }) };
  }
  const expense = await db.transaction.findUnique({
    where: { id },
    include: { property: { select: { name: true } }, category: { select: { name: true } } },
  });
  if (!expense || !EXPENSE_TYPES.includes(expense.type as (typeof EXPENSE_TYPES)[number])) {
    return { error: NextResponse.json({ error: "That expense no longer exists." }, { status: 404 }) };
  }
  const scope = await getPropertyScope(user);
  if (!inScope(scope, expense.propertyId)) return { error: outOfScope() };
  const isFinance = FINANCE_ROLES.includes(user.role);
  const isOwnPending = expense.createdById === user.id && expense.status === "PENDING";
  if (!isFinance && !isOwnPending) {
    return {
      error: NextResponse.json(
        { error: "Only finance can change an expense once it's been approved." },
        { status: 403 },
      ),
    };
  }
  return { user, expense, isFinance, scope };
}

export async function PATCH(request: Request, { params }: RouteContext<"/api/admin/expenses/[id]">) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the expense details." },
      { status: 400 },
    );
  }
  const loaded = await loadForWrite(id);
  if ("error" in loaded) return loaded.error;
  const { user, expense, isFinance, scope } = loaded;
  const data = parsed.data;
  if (!inScope(scope, data.propertyId)) return outOfScope();

  if (!isFinance && data.status && data.status !== "PENDING") {
    return NextResponse.json({ error: "Only finance can approve expenses." }, { status: 403 });
  }
  if (data.reimbursed !== undefined && !isFinance) {
    return NextResponse.json({ error: "Only finance can record reimbursements." }, { status: 403 });
  }
  const paidBy = data.paidBy === undefined ? expense.paidBy : data.paidBy;
  if (data.reimbursed && !paidBy) {
    return NextResponse.json({ error: "Set who paid before marking it reimbursed." }, { status: 400 });
  }
  // Nobody to pay back once it's on the business account; a different payer
  // starts unpaid.
  const reimbursedAt =
    data.reimbursed !== undefined
      ? data.reimbursed ? (expense.reimbursedAt ?? new Date()) : null
      : !paidBy || paidBy !== expense.paidBy
        ? null
        : undefined;

  let type = expense.type;
  if (data.categoryId && data.categoryId !== expense.categoryId) {
    const category = await db.transactionCategory.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      return NextResponse.json({ error: "That category no longer exists." }, { status: 404 });
    }
    if (!isFinance && category.group !== "ONE_TIME_EXPENSE" && category.group !== "RECURRING_EXPENSE") {
      return NextResponse.json({ error: "Pick an operating expense category." }, { status: 403 });
    }
    type =
      category.group === "INITIAL_INVESTMENT"
        ? "INVESTMENT"
        : category.isRefundableDeposit
          ? "DEPOSIT_OUT"
          : "EXPENSE";
  }
  if (data.propertyId && data.propertyId !== expense.propertyId) {
    const exists = await db.property.count({ where: { id: data.propertyId } });
    if (!exists) return NextResponse.json({ error: "That property no longer exists." }, { status: 404 });
  }

  const updated = await db.transaction.update({
    where: { id },
    data: {
      type,
      propertyId: data.propertyId,
      categoryId: data.categoryId,
      amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
      date: data.date ? parseISODate(data.date) : undefined,
      description: data.description,
      paymentMethod: data.paymentMethod,
      status: data.status,
      receiptUrl: data.receiptUrl === undefined ? undefined : data.receiptUrl || null,
      paidBy: data.paidBy,
      reimbursedAt,
    },
  });

  const approved = data.status && data.status !== expense.status && expense.status === "PENDING";
  const reimbursement =
    data.reimbursed !== undefined && paidBy
      ? ` ${data.reimbursed ? "reimbursed to" : "reimbursement undone for"} ${PAYER_LABELS[paidBy]}`
      : null;
  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: approved ? "EXPENSE_APPROVED" : reimbursement ? "EXPENSE_REIMBURSED" : "EXPENSE_UPDATED",
      entityType: "Transaction",
      entityId: id,
      summary: `${expense.property.name} · ${expense.category.name} ${formatINR(Number(updated.amount))}${
        approved ? ` marked ${updated.status.toLowerCase()}` : (reimbursement ?? " edited")
      }`,
    },
  });

  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/admin/expenses/[id]">) {
  const { id } = await params;
  const loaded = await loadForWrite(id);
  if ("error" in loaded) return loaded.error;
  const { user, expense } = loaded;

  await db.$transaction([
    db.transaction.delete({ where: { id } }),
    db.auditLog.create({
      data: {
        userId: user.id,
        userName: user.name,
        action: "EXPENSE_DELETED",
        entityType: "Transaction",
        entityId: id,
        summary: `${expense.property.name} · ${expense.category.name} ${formatINR(Number(expense.amount))} deleted`,
      },
    }),
  ]);

  return NextResponse.json({ deleted: true });
}
