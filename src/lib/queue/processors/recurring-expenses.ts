import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addMonths, endOfMonthUTC, startOfMonthUTC, todayUTC } from "@/lib/dates";
import type { ExpenseFrequency } from "@prisma/client";

function computeNextRun(current: Date, dayOfMonth: number, frequency: ExpenseFrequency): Date {
  const monthsToAdd = frequency === "YEARLY" ? 12 : 1;
  const base = addMonths(startOfMonthUTC(current), monthsToAdd);
  const daysInMonth = endOfMonthUTC(base).getUTCDate();
  const day = Math.min(dayOfMonth, daysInMonth);
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day));
}

/**
 * Runs daily. Posts the Transaction for any recurring expense whose
 * nextRunDate has arrived, then rolls nextRunDate forward - replacing what
 * used to be a one-time seed script with an actual schedule.
 */
export async function processRecurringExpenseRollover() {
  const today = todayUTC();

  const due = await db.recurringExpense.findMany({
    where: { status: "ACTIVE", nextRunDate: { lte: today } },
    include: { category: true, property: true },
  });

  let posted = 0;

  for (const expense of due) {
    if (expense.frequency === "ONE_TIME") {
      await db.recurringExpense.update({
        where: { id: expense.id },
        data: { status: "ENDED" },
      });
      continue;
    }

    const type =
      expense.category.group === "INITIAL_INVESTMENT"
        ? "INVESTMENT"
        : expense.category.isRefundableDeposit
          ? "DEPOSIT_OUT"
          : "EXPENSE";

    await db.transaction.create({
      data: {
        propertyId: expense.propertyId,
        categoryId: expense.categoryId,
        recurringExpenseId: expense.id,
        type,
        amount: new Prisma.Decimal(expense.amount),
        date: expense.nextRunDate,
        status: "PAID",
        paymentMethod: "BANK_TRANSFER",
        frequency: expense.frequency,
        description:
          expense.description ||
          `${expense.category.name} - ${expense.nextRunDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`,
      },
    });

    const nextRunDate = computeNextRun(expense.nextRunDate, expense.dayOfMonth, expense.frequency);
    const ended = Boolean(expense.endDate && nextRunDate > expense.endDate);

    await db.recurringExpense.update({
      where: { id: expense.id },
      data: ended ? { status: "ENDED" } : { nextRunDate },
    });

    posted += 1;
  }

  return { posted, checked: due.length };
}
