import "server-only";
import { db } from "@/lib/db";
import {
  endOfMonthUTC, startOfMonthUTC, todayUTC,
} from "@/lib/dates";
import {
  buildBreakEven, buildBudgetVariance, buildCapitalPosition,
  buildChannelProfitability, buildPeriodSeries, buildPL,
  PL_TRANSACTION_SELECT, type TxWithCategory,
} from "@/lib/finance/calculations";
import { onOperatingProperty, operatingProperty } from "@/lib/property/back-office";
import type { Period } from "@/lib/finance/period";

/**
 * Revenue is recognised on the check-in date. Within a period, stays whose
 * check-in is still ahead of today are "upcoming" - booked, not yet earned.
 */
function upcomingRevenue(txs: { type: string; amount: unknown; date: Date }[]) {
  const today = todayUTC();
  return txs
    .filter((t) => t.type === "REVENUE" && t.date > today)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export type PropertyFinance = Awaited<ReturnType<typeof getPropertyFinance>>;

export async function getPropertyFinance(propertyId: string, period: Period) {
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

  const periodTxs = allTxs.filter((t) => t.date >= period.from && t.date <= period.to);

  return {
    property,
    lifetime: buildPL(allTxs),
    period: buildPL(periodTxs),
    upcomingRevenue: upcomingRevenue(periodTxs),
    capital: buildCapitalPosition(allTxs),
    channels: buildChannelProfitability(periodTxs),
    // Break-even and budgets are inherently monthly - always the current month.
    breakEven: buildBreakEven(monthTxs, monthlyFixedCosts),
    series: buildPeriodSeries(periodTxs, period),
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
    recentTransactions: periodTxs.slice(0, 12),
  };
}

/**
 * Portfolio P&L for a reporting period. Capital figures (funds deployed,
 * recovery) are always lifetime - they only make sense over the whole life
 * of the investment - everything else covers the period alone.
 */
export async function getPortfolioFinance(period: Period) {
  const properties = await db.property.findMany({
    where: operatingProperty,
    include: {
      transactions: { select: PL_TRANSACTION_SELECT },
    },
    orderBy: { name: "asc" },
  });

  const inPeriod = <T extends { date: Date }>(txs: T[]) =>
    txs.filter((t) => t.date >= period.from && t.date <= period.to);

  const perProperty = properties.map((p) => ({
    id: p.id,
    name: p.name,
    locationArea: p.locationArea,
    period: buildPL(inPeriod(p.transactions)),
    capital: buildCapitalPosition(p.transactions),
  }));

  const allTxs = properties.flatMap((p) => p.transactions);
  const periodTxs = inPeriod(allTxs);

  return {
    perProperty,
    period: buildPL(periodTxs),
    upcomingRevenue: upcomingRevenue(periodTxs),
    capital: buildCapitalPosition(allTxs),
    channels: buildChannelProfitability(periodTxs),
    series: buildPeriodSeries(periodTxs, period),
  };
}

export async function getExpenses(options?: {
  propertyId?: string;
  propertyIds?: string[];
  status?: string;
  createdById?: string;
  period?: Period;
  limit?: number;
}) {
  return db.transaction.findMany({
    where: {
      type: { in: ["EXPENSE", "INVESTMENT", "DEPOSIT_OUT"] },
      ...onOperatingProperty,
      ...(options?.propertyId
        ? { propertyId: options.propertyId }
        : options?.propertyIds
          ? { propertyId: { in: options.propertyIds } }
          : {}),
      ...(options?.status ? { status: options.status as never } : {}),
      ...(options?.createdById ? { createdById: options.createdById } : {}),
      ...(options?.period ? { date: { gte: options.period.from, lte: options.period.to } } : {}),
    },
    include: {
      category: true,
      property: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: options?.limit ?? 100,
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
