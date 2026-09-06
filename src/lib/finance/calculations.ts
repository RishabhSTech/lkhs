import type {
  BookingSource,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@prisma/client";

/**
 * Every figure here is derived from Transaction rows - nothing is read from a
 * stored total. Refundable security deposits are tracked as DEPOSIT_IN /
 * DEPOSIT_OUT and deliberately excluded from expenses and NOI.
 */

export type TxWithCategory = Transaction & { category: TransactionCategory };

const REVENUE_TYPES: TransactionType[] = ["REVENUE"];
const FEE_TYPES: TransactionType[] = ["OTA_FEE", "PAYMENT_FEE"];
const EXPENSE_TYPES: TransactionType[] = ["EXPENSE"];
const INVESTMENT_TYPES: TransactionType[] = ["INVESTMENT"];

function sum(txs: TxWithCategory[]): number {
  return txs.reduce((total, t) => total + Number(t.amount), 0);
}

function byTypes(txs: TxWithCategory[], types: TransactionType[]) {
  return txs.filter((t) => types.includes(t.type));
}

export type PLStatement = {
  grossRevenue: number;
  otaFees: number;
  paymentFees: number;
  netRevenue: number;
  operatingExpenses: number;
  expensesByCategory: { name: string; amount: number }[];
  netOperatingIncome: number;
  /** Refundable deposits - held, not earned/spent. Shown separately. */
  depositsHeld: number;
};

export function buildPL(txs: TxWithCategory[]): PLStatement {
  const grossRevenue = sum(byTypes(txs, REVENUE_TYPES));
  const otaFees = sum(txs.filter((t) => t.type === "OTA_FEE"));
  const paymentFees = sum(txs.filter((t) => t.type === "PAYMENT_FEE"));
  const netRevenue = grossRevenue - otaFees - paymentFees;

  const expenseTxs = byTypes(txs, EXPENSE_TYPES);
  const operatingExpenses = sum(expenseTxs);

  const grouped = new Map<string, number>();
  for (const t of expenseTxs) {
    grouped.set(
      t.category.name,
      (grouped.get(t.category.name) ?? 0) + Number(t.amount),
    );
  }

  const depositsIn = sum(txs.filter((t) => t.type === "DEPOSIT_IN"));
  const depositsOut = sum(txs.filter((t) => t.type === "DEPOSIT_OUT"));

  return {
    grossRevenue,
    otaFees,
    paymentFees,
    netRevenue,
    operatingExpenses,
    expensesByCategory: [...grouped.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    netOperatingIncome: netRevenue - operatingExpenses,
    depositsHeld: depositsIn - depositsOut,
  };
}

export type CapitalPosition = {
  totalFundsDeployed: number;
  cumulativeNetEarnings: number;
  capitalRecoveredPercent: number;
  remainingToRecover: number;
  roiPercent: number;
};

/**
 * Funds deployed counts INVESTMENT plus refundable security deposits paid out
 * (cash is genuinely tied up), even though deposits are recoverable later.
 */
export function buildCapitalPosition(txs: TxWithCategory[]): CapitalPosition {
  const investment = sum(byTypes(txs, INVESTMENT_TYPES));
  const refundableDeposits = sum(
    txs.filter((t) => t.type === "DEPOSIT_OUT" && t.category.isRefundableDeposit),
  );
  const totalFundsDeployed = investment + refundableDeposits;

  const { netOperatingIncome } = buildPL(txs);
  const cumulativeNetEarnings = netOperatingIncome;

  const capitalRecoveredPercent =
    totalFundsDeployed > 0
      ? (cumulativeNetEarnings / totalFundsDeployed) * 100
      : 0;

  return {
    totalFundsDeployed,
    cumulativeNetEarnings,
    capitalRecoveredPercent: Math.max(0, capitalRecoveredPercent),
    remainingToRecover: Math.max(0, totalFundsDeployed - cumulativeNetEarnings),
    roiPercent: capitalRecoveredPercent,
  };
}

export type ChannelProfitability = {
  source: BookingSource;
  grossRevenue: number;
  fees: number;
  netRevenue: number;
  sharePercent: number;
};

/**
 * Attributes revenue and its fees to the booking channel via the linked
 * reservation. Transactions with no reservation (e.g. manual adjustments)
 * fall into OTHER.
 */
export function buildChannelProfitability(
  txs: (TxWithCategory & { reservation: { source: BookingSource } | null })[],
): ChannelProfitability[] {
  const map = new Map<BookingSource, { gross: number; fees: number }>();

  for (const t of txs) {
    const isRevenue = REVENUE_TYPES.includes(t.type);
    const isFee = FEE_TYPES.includes(t.type);
    if (!isRevenue && !isFee) continue;

    const source: BookingSource = t.reservation?.source ?? "OTHER";
    const entry = map.get(source) ?? { gross: 0, fees: 0 };
    if (isRevenue) entry.gross += Number(t.amount);
    else entry.fees += Number(t.amount);
    map.set(source, entry);
  }

  const rows = [...map.entries()].map(([source, { gross, fees }]) => ({
    source,
    grossRevenue: gross,
    fees,
    netRevenue: gross - fees,
    sharePercent: 0,
  }));

  const totalNet = rows.reduce((s, r) => s + r.netRevenue, 0);
  for (const row of rows) {
    row.sharePercent = totalNet > 0 ? (row.netRevenue / totalNet) * 100 : 0;
  }

  return rows.sort((a, b) => b.netRevenue - a.netRevenue);
}

export type BreakEven = {
  monthlyFixedCosts: number;
  variableCostRatio: number;
  breakEvenRevenue: number;
  currentRevenue: number;
  surplus: number;
};

/**
 * Fixed costs come from recurring expense totals; the variable ratio is the
 * share of gross revenue consumed by OTA and payment fees.
 */
export function buildBreakEven(
  txs: TxWithCategory[],
  monthlyFixedCosts: number,
): BreakEven {
  const grossRevenue = sum(byTypes(txs, REVENUE_TYPES));
  const fees = sum(byTypes(txs, FEE_TYPES));
  const variableCostRatio = grossRevenue > 0 ? fees / grossRevenue : 0;

  const breakEvenRevenue =
    variableCostRatio < 1 ? monthlyFixedCosts / (1 - variableCostRatio) : 0;

  return {
    monthlyFixedCosts,
    variableCostRatio,
    breakEvenRevenue,
    currentRevenue: grossRevenue,
    surplus: grossRevenue - breakEvenRevenue,
  };
}

export type MonthlySeriesPoint = {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
};

export function buildMonthlySeries(
  txs: TxWithCategory[],
  months: Date[],
): MonthlySeriesPoint[] {
  return months.map((monthStart) => {
    const y = monthStart.getUTCFullYear();
    const m = monthStart.getUTCMonth();
    const inMonth = txs.filter((t) => {
      const d = new Date(t.date);
      return d.getUTCFullYear() === y && d.getUTCMonth() === m;
    });

    const pl = buildPL(inMonth);
    return {
      month: monthStart.toISOString().slice(0, 7),
      revenue: pl.grossRevenue,
      expenses: pl.operatingExpenses + pl.otaFees + pl.paymentFees,
      net: pl.netOperatingIncome,
    };
  });
}

export type BudgetVariance = {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  isOverBudget: boolean;
};

export function buildBudgetVariance(
  txs: TxWithCategory[],
  budgets: { categoryId: string; categoryName: string; amount: number }[],
): BudgetVariance[] {
  return budgets.map((b) => {
    const actual = sum(
      txs.filter((t) => t.categoryId === b.categoryId && t.type === "EXPENSE"),
    );
    return {
      category: b.categoryName,
      budget: b.amount,
      actual,
      variance: b.amount - actual,
      isOverBudget: actual > b.amount,
    };
  });
}
