import "server-only";
import { db } from "@/lib/db";
import {
  addMonths, endOfMonthUTC, startOfMonthUTC, todayUTC,
} from "@/lib/dates";
import {
  buildBreakEven, buildBudgetVariance, buildCapitalPosition,
  buildChannelProfitability, buildMonthlySeries, buildPL, type TxWithCategory,
} from "@/lib/finance/calculations";

export type PropertyFinance = Awaited<ReturnType<typeof getPropertyFinance>>;

export async function getPropertyFinance(propertyId: string, monthsBack = 6) {
  const today = todayUTC();
  const monthStart = startOfMonthUTC(today);
  const monthEnd = endOfMonthUTC(today);

  const property = await db.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });

  const allTxs = (await db.transaction.findMany({
    where: { propertyId },
    include: { category: true, reservation: { select: { source: true } } },
    orderBy: { date: "desc" },
  })) as (TxWithCategory & { reservation: { source: never } | null })[];

  const monthTxs = allTxs.filter((t) => {
    const d = new Date(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  const recurring = await db.recurringExpense.findMany({
    where: { propertyId, status: "ACTIVE" },
    include: { category: true },
  });
  const monthlyFixedCosts = recurring.reduce(
    (sum, r) => sum + (r.frequency === "MONTHLY" ? Number(r.amount) : 0),
    0,
  );

  const budgets = await db.budget.findMany({
    where: { propertyId, month: monthStart },
    include: { category: true },
  });

  const months = Array.from({ length: monthsBack }, (_, i) =>
    startOfMonthUTC(addMonths(today, -(monthsBack - 1 - i))),
  );

  return {
    property,
    lifetime: buildPL(allTxs),
    currentMonth: buildPL(monthTxs),
    capital: buildCapitalPosition(allTxs),
    channels: buildChannelProfitability(allTxs),
    breakEven: buildBreakEven(monthTxs, monthlyFixedCosts),
    monthlySeries: buildMonthlySeries(allTxs, months),
    budgets: buildBudgetVariance(
      monthTxs,
      budgets.map((b) => ({
        categoryId: b.categoryId,
        categoryName: b.category.name,
        amount: Number(b.amount),
      })),
    ),
    recurring: recurring.map((r) => ({
      id: r.id,
      categoryName: r.category.name,
      amount: Number(r.amount),
      frequency: r.frequency,
      dayOfMonth: r.dayOfMonth,
      status: r.status,
      nextRunDate: r.nextRunDate,
    })),
    recentTransactions: allTxs.slice(0, 12),
  };
}

export async function getPortfolioFinance(monthsBack = 6) {
  const today = todayUTC();
  const monthStart = startOfMonthUTC(today);
  const monthEnd = endOfMonthUTC(today);

  const properties = await db.property.findMany({
    include: {
      transactions: {
        include: { category: true, reservation: { select: { source: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const perProperty = properties.map((p) => {
    const txs = p.transactions as TxWithCategory[];
    const monthTxs = txs.filter((t) => {
      const d = new Date(t.date);
      return d >= monthStart && d <= monthEnd;
    });
    return {
      id: p.id,
      name: p.name,
      locationArea: p.locationArea,
      lifetime: buildPL(txs),
      currentMonth: buildPL(monthTxs),
      capital: buildCapitalPosition(txs),
    };
  });

  const allTxs = properties.flatMap((p) => p.transactions) as (TxWithCategory & {
    reservation: { source: never } | null;
  })[];

  const months = Array.from({ length: monthsBack }, (_, i) =>
    startOfMonthUTC(addMonths(today, -(monthsBack - 1 - i))),
  );

  return {
    perProperty,
    lifetime: buildPL(allTxs),
    currentMonth: buildPL(
      allTxs.filter((t) => {
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      }),
    ),
    capital: buildCapitalPosition(allTxs),
    channels: buildChannelProfitability(allTxs),
    monthlySeries: buildMonthlySeries(allTxs, months),
  };
}

export async function getExpenses(options?: {
  propertyId?: string;
  status?: string;
  limit?: number;
}) {
  return db.transaction.findMany({
    where: {
      type: { in: ["EXPENSE", "INVESTMENT", "DEPOSIT_OUT"] },
      ...(options?.propertyId ? { propertyId: options.propertyId } : {}),
      ...(options?.status ? { status: options.status as never } : {}),
    },
    include: {
      category: true,
      property: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: options?.limit ?? 60,
  });
}

export async function getExpenseCategories() {
  return db.transactionCategory.findMany({
    where: {
      group: { in: ["INITIAL_INVESTMENT", "RECURRING_EXPENSE", "ONE_TIME_EXPENSE", "DEPOSIT"] },
    },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });
}
