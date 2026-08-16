import "server-only";
import { db } from "@/lib/db";
import {
  addDays, endOfMonthUTC, startOfMonthUTC, todayUTC,
} from "@/lib/dates";
import {
  buildCapitalPosition, buildPL, type TxWithCategory,
} from "@/lib/finance/calculations";
import { formatDateLong, formatINR, formatPercent } from "@/lib/format";

/**
 * Deterministic question answering over real aggregates — not a language model.
 * Every answer is computed from the database, and anything that would change
 * data is returned as a proposal for explicit confirmation rather than applied.
 */

export type AskLimeAnswer = {
  answer: string;
  detail?: { label: string; value: string }[];
  /** Present when the request implies a change; requires confirmation. */
  proposedAction?: { summary: string; requiresConfirmation: true };
  matched: boolean;
};

export const SUGGESTED_QUESTIONS = [
  "How much revenue did we make this month?",
  "Which property is most profitable?",
  "How much did we spend on cleaning last month?",
  "Which bookings arrive tomorrow?",
  "Which properties are over budget?",
  "Which property has the highest ROI?",
  "Recommend a price increase for next weekend.",
];

export async function askLime(question: string): Promise<AskLimeAnswer> {
  const q = question.toLowerCase();
  const today = todayUTC();

  if (/(arriv|check.?in).*(tomorrow)|tomorrow.*(arriv|check.?in)/.test(q)) {
    return arrivals(addDays(today, 1), "tomorrow");
  }
  if (/(arriv|check.?in).*(today)|today.*(arriv|check.?in)/.test(q)) {
    return arrivals(today, "today");
  }
  if (/(most|highest).*(profit)|profitab/.test(q)) return mostProfitable();
  if (/(highest|best).*roi|roi/.test(q)) return highestRoi();
  if (/budget/.test(q)) return budgetStatus();
  if (/spend|spent|expense/.test(q)) return spendByCategory(q);
  if (/revenue|earn|income|made/.test(q)) return revenueSummary(q);
  if (/price|rate|increase|pricing/.test(q)) return pricingRecommendation();

  return {
    matched: false,
    answer:
      "I can answer questions about revenue, expenses, profitability, ROI, budgets, occupancy and upcoming arrivals. Try one of the suggestions below.",
  };
}

async function arrivals(date: Date, label: string): Promise<AskLimeAnswer> {
  const reservations = await db.reservation.findMany({
    where: { checkIn: date, status: { in: ["CONFIRMED", "COMPLETED"] } },
    include: {
      guest: { select: { name: true } },
      property: { select: { name: true } },
    },
    orderBy: { property: { name: "asc" } },
  });

  if (reservations.length === 0) {
    return { matched: true, answer: `No arrivals ${label} (${formatDateLong(date)}).` };
  }

  return {
    matched: true,
    answer: `${reservations.length} ${
      reservations.length === 1 ? "arrival" : "arrivals"
    } ${label}, ${formatDateLong(date)}.`,
    detail: reservations.map((r) => ({
      label: r.guest.name,
      value: `${r.property.name} · ${r.nights}n`,
    })),
  };
}

async function propertyPLs() {
  const properties = await db.property.findMany({
    include: { transactions: { include: { category: true } } },
  });

  return properties.map((p) => ({
    property: p,
    pl: buildPL(p.transactions as TxWithCategory[]),
    capital: buildCapitalPosition(p.transactions as TxWithCategory[]),
  }));
}

async function mostProfitable(): Promise<AskLimeAnswer> {
  const rows = (await propertyPLs()).sort(
    (a, b) => b.pl.netOperatingIncome - a.pl.netOperatingIncome,
  );
  const top = rows[0];
  if (!top) return { matched: true, answer: "No properties yet." };

  return {
    matched: true,
    answer: `${top.property.name} is the most profitable, with ${formatINR(
      top.pl.netOperatingIncome,
    )} in net operating income to date.`,
    detail: rows.map((r) => ({
      label: r.property.name,
      value: formatINR(r.pl.netOperatingIncome),
    })),
  };
}

async function highestRoi(): Promise<AskLimeAnswer> {
  const rows = (await propertyPLs()).sort(
    (a, b) => b.capital.roiPercent - a.capital.roiPercent,
  );
  const top = rows[0];
  if (!top) return { matched: true, answer: "No properties yet." };

  return {
    matched: true,
    answer: `${top.property.name} has the highest return, at ${formatPercent(
      top.capital.roiPercent,
    )} of deployed capital recovered.`,
    detail: rows.map((r) => ({
      label: r.property.name,
      value: `${formatPercent(r.capital.roiPercent)} of ${formatINR(
        r.capital.totalFundsDeployed,
      )}`,
    })),
  };
}

async function budgetStatus(): Promise<AskLimeAnswer> {
  const today = todayUTC();
  const monthStart = startOfMonthUTC(today);

  const budgets = await db.budget.findMany({
    where: { month: monthStart },
    include: { property: true, category: true },
  });

  const rows = await Promise.all(
    budgets.map(async (b) => {
      const spent = await db.transaction.aggregate({
        where: {
          propertyId: b.propertyId,
          categoryId: b.categoryId,
          type: "EXPENSE",
          date: { gte: monthStart, lte: endOfMonthUTC(today) },
        },
        _sum: { amount: true },
      });
      const actual = Number(spent._sum.amount ?? 0);
      return {
        property: b.property.name,
        category: b.category.name,
        budget: Number(b.amount),
        actual,
        over: actual > Number(b.amount),
      };
    }),
  );

  const over = rows.filter((r) => r.over);
  if (over.length === 0) {
    return {
      matched: true,
      answer: "Every property is within budget this month.",
      detail: rows.slice(0, 6).map((r) => ({
        label: `${r.property} · ${r.category}`,
        value: `${formatINR(r.actual)} of ${formatINR(r.budget)}`,
      })),
    };
  }

  return {
    matched: true,
    answer: `${over.length} budget ${
      over.length === 1 ? "line is" : "lines are"
    } over this month.`,
    detail: over.map((r) => ({
      label: `${r.property} · ${r.category}`,
      value: `${formatINR(r.actual)} vs ${formatINR(r.budget)} budget`,
    })),
  };
}

async function spendByCategory(q: string): Promise<AskLimeAnswer> {
  const today = todayUTC();
  const lastMonth = /last month/.test(q);
  const anchor = lastMonth
    ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    : today;
  const from = startOfMonthUTC(anchor);
  const to = endOfMonthUTC(anchor);

  const categoryMatch = [
    "cleaning", "rent", "laundry", "electricity", "internet",
    "maintenance", "consumables", "staff",
  ].find((c) => q.includes(c));

  const txs = await db.transaction.findMany({
    where: {
      type: "EXPENSE",
      date: { gte: from, lte: to },
      ...(categoryMatch
        ? { category: { name: { equals: categoryMatch, mode: "insensitive" } } }
        : {}),
    },
    include: { category: true, property: { select: { name: true } } },
  });

  const total = txs.reduce((s, t) => s + Number(t.amount), 0);
  const period = lastMonth ? "last month" : "this month";

  if (categoryMatch) {
    const byProperty = new Map<string, number>();
    for (const t of txs) {
      byProperty.set(
        t.property.name,
        (byProperty.get(t.property.name) ?? 0) + Number(t.amount),
      );
    }
    return {
      matched: true,
      answer: `${formatINR(total)} on ${categoryMatch} ${period}.`,
      detail: [...byProperty.entries()].map(([label, value]) => ({
        label,
        value: formatINR(value),
      })),
    };
  }

  const byCategory = new Map<string, number>();
  for (const t of txs) {
    byCategory.set(
      t.category.name,
      (byCategory.get(t.category.name) ?? 0) + Number(t.amount),
    );
  }

  return {
    matched: true,
    answer: `${formatINR(total)} in operating expenses ${period}.`,
    detail: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value: formatINR(value) })),
  };
}

async function revenueSummary(q: string): Promise<AskLimeAnswer> {
  const today = todayUTC();
  const lastMonth = /last month/.test(q);
  const anchor = lastMonth
    ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
    : today;
  const from = startOfMonthUTC(anchor);
  const to = endOfMonthUTC(anchor);

  const properties = await db.property.findMany({
    include: {
      transactions: {
        where: { date: { gte: from, lte: to } },
        include: { category: true },
      },
    },
  });

  const named = properties.find((p) =>
    q.includes(p.name.toLowerCase().replace(/^the /, "")),
  );
  const period = lastMonth ? "last month" : "this month";

  if (named) {
    const pl = buildPL(named.transactions as TxWithCategory[]);
    return {
      matched: true,
      answer: `${named.name} generated ${formatINR(pl.grossRevenue)} ${period}.`,
      detail: [
        { label: "Gross revenue", value: formatINR(pl.grossRevenue) },
        { label: "Channel + payment fees", value: formatINR(pl.otaFees + pl.paymentFees) },
        { label: "Operating expenses", value: formatINR(pl.operatingExpenses) },
        { label: "Net operating income", value: formatINR(pl.netOperatingIncome) },
      ],
    };
  }

  const all = properties.flatMap((p) => p.transactions) as TxWithCategory[];
  const pl = buildPL(all);

  return {
    matched: true,
    answer: `The portfolio generated ${formatINR(pl.grossRevenue)} ${period}, with ${formatINR(
      pl.netOperatingIncome,
    )} net operating income.`,
    detail: properties.map((p) => ({
      label: p.name,
      value: formatINR(buildPL(p.transactions as TxWithCategory[]).grossRevenue),
    })),
  };
}

async function pricingRecommendation(): Promise<AskLimeAnswer> {
  const today = todayUTC();
  const unitCount = await db.unit.count();

  // Look at the next Friday/Saturday pair.
  const daysToFriday = (5 - today.getUTCDay() + 7) % 7 || 7;
  const friday = addDays(today, daysToFriday);
  const sunday = addDays(friday, 2);

  const booked = await db.inventoryNight.count({
    where: { date: { gte: friday, lt: sunday }, reservationId: { not: null } },
  });
  const capacity = unitCount * 2;
  const occupancy = capacity > 0 ? (booked / capacity) * 100 : 0;

  const suggestion =
    occupancy >= 70 ? 12 : occupancy >= 40 ? 0 : -8;

  if (suggestion === 0) {
    return {
      matched: true,
      answer: `Next weekend is ${formatPercent(occupancy)} booked — that's a normal pace. I'd leave rates as they are.`,
    };
  }

  return {
    matched: true,
    answer:
      suggestion > 0
        ? `Next weekend is ${formatPercent(occupancy)} booked, which is running hot. A ${suggestion}% weekend uplift looks justified.`
        : `Next weekend is only ${formatPercent(occupancy)} booked. A ${Math.abs(suggestion)}% reduction would help fill it.`,
    detail: [
      { label: "Weekend of", value: formatDateLong(friday) },
      { label: "Nights booked", value: `${booked} of ${capacity}` },
    ],
    proposedAction: {
      summary: `Apply a ${suggestion > 0 ? "+" : ""}${suggestion}% adjustment to weekend rates across all properties`,
      requiresConfirmation: true,
    },
  };
}
