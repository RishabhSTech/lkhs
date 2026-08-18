import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import type {
  BookingSource,
  Transaction,
  TransactionCategory,
  TransactionCategoryGroup,
  TransactionType,
} from "@prisma/client";
import {
  buildBreakEven,
  buildBudgetVariance,
  buildCapitalPosition,
  buildChannelProfitability,
  buildPL,
  type TxWithCategory,
} from "./calculations";

/**
 * A known, hand-computed transaction set exercising every branch of the P&L
 * / ROI arithmetic: gross revenue, both fee types, one expense category,
 * refundable deposits (which must stay out of expenses and NOI), and an
 * initial investment. Every assertion below is computed by hand, not derived
 * from the code under test.
 */

let idCounter = 0;
function category(
  name: string,
  group: TransactionCategoryGroup,
  isRefundableDeposit = false,
): TransactionCategory {
  return { id: `cat_${name}`, name, group, isRefundableDeposit };
}

const ACCOMMODATION = category("Accommodation", "REVENUE");
const OTA_COMMISSION = category("OTA commission", "OTA_FEE");
const GATEWAY_FEE = category("Payment gateway fee", "PAYMENT_FEE");
const CLEANING_SUPPLIES = category("Cleaning supplies", "ONE_TIME_EXPENSE");
const SECURITY_DEPOSIT = category("Security deposit", "DEPOSIT", true);
const FURNITURE = category("Furniture", "INITIAL_INVESTMENT");

function tx(
  type: TransactionType,
  amount: number,
  categoryRow: TransactionCategory,
  extra: Partial<Omit<Transaction, "reservation">> & {
    reservation?: { source: BookingSource } | null;
  } = {},
): TxWithCategory & { reservation: { source: BookingSource } | null } {
  idCounter += 1;
  const { reservation = null, ...transactionFields } = extra;
  return {
    id: `tx_${idCounter}`,
    propertyId: "prop_1",
    categoryId: categoryRow.id,
    type,
    amount: new Prisma.Decimal(amount),
    currency: "INR",
    date: new Date("2026-06-15"),
    description: null,
    paymentMethod: "UPI",
    status: "PAID",
    frequency: null,
    receiptUrl: null,
    reservationId: null,
    recurringExpenseId: null,
    createdById: null,
    createdAt: new Date("2026-06-15"),
    updatedAt: new Date("2026-06-15"),
    category: categoryRow,
    reservation,
    ...transactionFields,
  };
}

const knownTxs: TxWithCategory[] = [
  tx("REVENUE", 10_000, ACCOMMODATION),
  tx("REVENUE", 8_000, ACCOMMODATION),
  tx("OTA_FEE", 1_120, OTA_COMMISSION), // 14% of the 8,000 OTA booking
  tx("PAYMENT_FEE", 360, GATEWAY_FEE), // 2% of both bookings combined
  tx("EXPENSE", 2_500, CLEANING_SUPPLIES),
  tx("DEPOSIT_IN", 5_000, SECURITY_DEPOSIT),
  tx("DEPOSIT_OUT", 3_000, SECURITY_DEPOSIT),
  tx("INVESTMENT", 50_000, FURNITURE),
];

describe("buildPL", () => {
  const pl = buildPL(knownTxs);

  it("sums gross revenue across all REVENUE rows", () => {
    expect(pl.grossRevenue).toBe(18_000);
  });

  it("separates OTA and payment fees", () => {
    expect(pl.otaFees).toBe(1_120);
    expect(pl.paymentFees).toBe(360);
  });

  it("nets revenue as gross minus both fee types", () => {
    expect(pl.netRevenue).toBe(18_000 - 1_120 - 360);
  });

  it("totals operating expenses from EXPENSE rows only", () => {
    expect(pl.operatingExpenses).toBe(2_500);
  });

  it("groups expenses by category", () => {
    expect(pl.expensesByCategory).toEqual([{ name: "Cleaning supplies", amount: 2_500 }]);
  });

  it("computes net operating income as net revenue minus expenses", () => {
    expect(pl.netOperatingIncome).toBe(18_000 - 1_120 - 360 - 2_500);
  });

  it("excludes refundable deposits from expenses and NOI, tracking them separately", () => {
    expect(pl.depositsHeld).toBe(5_000 - 3_000);
    expect(pl.operatingExpenses).not.toBe(2_500 + 3_000);
  });

  it("ignores INVESTMENT rows entirely", () => {
    const withoutInvestment = buildPL(knownTxs.filter((t) => t.type !== "INVESTMENT"));
    expect(withoutInvestment).toEqual(pl);
  });
});

describe("buildCapitalPosition", () => {
  const position = buildCapitalPosition(knownTxs);
  // funds deployed = 50,000 investment + 3,000 refundable deposit paid out
  const expectedDeployed = 53_000;
  // NOI from the buildPL suite above
  const expectedNOI = 18_000 - 1_120 - 360 - 2_500;

  it("counts investment plus refundable deposits paid out as funds deployed", () => {
    expect(position.totalFundsDeployed).toBe(expectedDeployed);
  });

  it("uses net operating income as cumulative net earnings", () => {
    expect(position.cumulativeNetEarnings).toBe(expectedNOI);
  });

  it("computes recovered percent and ROI identically off deployed capital", () => {
    const expectedPercent = (expectedNOI / expectedDeployed) * 100;
    expect(position.capitalRecoveredPercent).toBeCloseTo(expectedPercent, 6);
    expect(position.roiPercent).toBeCloseTo(expectedPercent, 6);
  });

  it("computes remaining-to-recover as deployed minus earned, floored at zero", () => {
    expect(position.remainingToRecover).toBe(expectedDeployed - expectedNOI);
  });

  it("floors recovered percent and remaining at zero when earnings are negative", () => {
    const lossOnly = buildCapitalPosition([
      tx("INVESTMENT", 10_000, FURNITURE),
      tx("EXPENSE", 4_000, CLEANING_SUPPLIES),
    ]);
    expect(lossOnly.capitalRecoveredPercent).toBe(0);
    expect(lossOnly.remainingToRecover).toBe(10_000 - -4_000);
  });

  it("returns zero percent when no funds have been deployed", () => {
    const noInvestment = buildCapitalPosition([tx("REVENUE", 1_000, ACCOMMODATION)]);
    expect(noInvestment.totalFundsDeployed).toBe(0);
    expect(noInvestment.capitalRecoveredPercent).toBe(0);
  });
});

describe("buildChannelProfitability", () => {
  const channelTxs = [
    tx("REVENUE", 10_000, ACCOMMODATION, { reservation: { source: "DIRECT" } }),
    tx("REVENUE", 8_000, ACCOMMODATION, { reservation: { source: "AIRBNB" } }),
    tx("OTA_FEE", 1_120, OTA_COMMISSION, { reservation: { source: "AIRBNB" } }),
    tx("PAYMENT_FEE", 200, GATEWAY_FEE, { reservation: { source: "DIRECT" } }),
    tx("PAYMENT_FEE", 160, GATEWAY_FEE, { reservation: { source: "AIRBNB" } }),
    tx("EXPENSE", 500, CLEANING_SUPPLIES, { reservation: { source: "DIRECT" } }), // ignored: not revenue/fee
  ];

  const rows = buildChannelProfitability(channelTxs);
  const direct = rows.find((r) => r.source === "DIRECT")!;
  const airbnb = rows.find((r) => r.source === "AIRBNB")!;

  it("attributes gross revenue and fees per channel via the linked reservation", () => {
    expect(direct.grossRevenue).toBe(10_000);
    expect(direct.fees).toBe(200);
    expect(airbnb.grossRevenue).toBe(8_000);
    expect(airbnb.fees).toBe(1_120 + 160);
  });

  it("nets revenue per channel and ignores non-revenue/fee rows", () => {
    expect(direct.netRevenue).toBe(10_000 - 200);
    expect(airbnb.netRevenue).toBe(8_000 - 1_120 - 160);
  });

  it("shares sum to 100% across channels", () => {
    const totalShare = rows.reduce((s, r) => s + r.sharePercent, 0);
    expect(totalShare).toBeCloseTo(100, 6);
  });

  it("falls back transactions with no reservation to OTHER", () => {
    const rows2 = buildChannelProfitability([tx("REVENUE", 1_000, ACCOMMODATION, { reservation: null })]);
    expect(rows2).toHaveLength(1);
    expect(rows2[0].source).toBe("OTHER");
  });
});

describe("buildBreakEven", () => {
  it("computes break-even revenue from fixed costs and the fee-driven variable ratio", () => {
    // grossRevenue = 18,000; fees = 1,120 + 360 = 1,480; ratio = 1,480/18,000
    const result = buildBreakEven(knownTxs, 10_000);
    const variableCostRatio = 1_480 / 18_000;
    expect(result.variableCostRatio).toBeCloseTo(variableCostRatio, 6);
    expect(result.breakEvenRevenue).toBeCloseTo(10_000 / (1 - variableCostRatio), 6);
    expect(result.currentRevenue).toBe(18_000);
    expect(result.surplus).toBeCloseTo(18_000 - 10_000 / (1 - variableCostRatio), 6);
  });

  it("returns zero break-even revenue when fees would consume all of revenue", () => {
    const allFees = [tx("REVENUE", 100, ACCOMMODATION), tx("OTA_FEE", 100, OTA_COMMISSION)];
    const result = buildBreakEven(allFees, 5_000);
    expect(result.variableCostRatio).toBe(1);
    expect(result.breakEvenRevenue).toBe(0);
  });
});

describe("buildBudgetVariance", () => {
  it("compares actual EXPENSE spend per category against its budget", () => {
    const rows = buildBudgetVariance(knownTxs, [
      { categoryId: CLEANING_SUPPLIES.id, categoryName: "Cleaning supplies", amount: 2_000 },
    ]);
    expect(rows).toEqual([
      {
        category: "Cleaning supplies",
        budget: 2_000,
        actual: 2_500,
        variance: -500,
        isOverBudget: true,
      },
    ]);
  });

  it("is not over budget when actual spend is exactly the budget", () => {
    const rows = buildBudgetVariance(
      [tx("EXPENSE", 1_000, CLEANING_SUPPLIES)],
      [{ categoryId: CLEANING_SUPPLIES.id, categoryName: "Cleaning supplies", amount: 1_000 }],
    );
    expect(rows[0].isOverBudget).toBe(false);
    expect(rows[0].variance).toBe(0);
  });
});
