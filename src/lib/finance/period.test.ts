import { describe, expect, it } from "vitest";
import type { TransactionType } from "@prisma/client";
import { parseISODate, toISODate } from "@/lib/dates";
import { buildCapitalPosition, buildPeriodSeries, type PLTransaction } from "./calculations";
import { parsePeriod, periodBuckets, periodParams } from "./period";

const TODAY = parseISODate("2026-11-23");
const iso = (d: Date) => toISODate(d);

describe("parsePeriod", () => {
  it("defaults to the current month, charted by day", () => {
    const p = parsePeriod({}, "month", TODAY);
    expect([p.kind, iso(p.from), iso(p.to), p.bucket]).toEqual(["month", "2026-11-01", "2026-11-30", "day"]);
  });

  it("can default to the current year instead", () => {
    const p = parsePeriod({}, "year", TODAY);
    expect([p.kind, iso(p.from), iso(p.to), p.bucket]).toEqual(["year", "2026-01-01", "2026-12-31", "month"]);
  });

  it("reads a specific month, including February in a leap year", () => {
    const p = parsePeriod({ period: "month", month: "2028-02" }, "month", TODAY);
    expect([iso(p.from), iso(p.to)]).toEqual(["2028-02-01", "2028-02-29"]);
  });

  it("reads a specific year", () => {
    const p = parsePeriod({ period: "year", year: "2025" }, "month", TODAY);
    expect([iso(p.from), iso(p.to)]).toEqual(["2025-01-01", "2025-12-31"]);
  });

  it("reads a custom range and swaps reversed dates", () => {
    const p = parsePeriod({ period: "custom", from: "2026-11-20", to: "2026-11-05" }, "month", TODAY);
    expect([p.kind, iso(p.from), iso(p.to), p.bucket]).toEqual(["custom", "2026-11-05", "2026-11-20", "day"]);
  });

  it("charts long custom ranges by month", () => {
    const p = parsePeriod({ period: "custom", from: "2026-01-15", to: "2026-11-10" }, "month", TODAY);
    expect(p.bucket).toBe("month");
    expect(periodBuckets(p).map(iso)).toHaveLength(11);
  });

  it("falls back safely on junk input", () => {
    expect(iso(parsePeriod({ period: "month", month: "2026-13" }, "month", TODAY).from)).toBe("2026-11-01");
    expect(iso(parsePeriod({ period: "year", year: "abc" }, "month", TODAY).from)).toBe("2026-01-01");
    expect(parsePeriod({ period: "custom", from: "2026-02-31", to: "2026-03-01" }, "month", TODAY).kind).toBe("month");
  });

  it("round-trips through its URL params", () => {
    for (const params of [
      { period: "month", month: "2026-10" },
      { period: "year", year: "2026" },
      { period: "custom", from: "2026-11-01", to: "2026-11-15" },
    ]) {
      expect(periodParams(parsePeriod(params, "month", TODAY))).toEqual(params);
    }
  });
});

function tx(type: TransactionType, amount: number, date: string): PLTransaction {
  return {
    type,
    amount: amount as never,
    date: parseISODate(date),
    category: { name: type === "REVENUE" ? "Accommodation" : "Cleaning", isRefundableDeposit: false },
    reservation: null,
  } as PLTransaction;
}

describe("buildPeriodSeries", () => {
  it("buckets a month by day with zero-filled gaps", () => {
    const p = parsePeriod({ period: "month", month: "2026-11" }, "month", TODAY);
    const series = buildPeriodSeries(
      [tx("REVENUE", 1000, "2026-11-02"), tx("REVENUE", 500, "2026-11-02"), tx("EXPENSE", 300, "2026-11-03")],
      p,
    );
    expect(series).toHaveLength(30);
    expect(series[1]).toEqual({ month: "2026-11-02", revenue: 1500, expenses: 0, net: 1500 });
    expect(series[2]).toEqual({ month: "2026-11-03", revenue: 0, expenses: 300, net: -300 });
    expect(series[0].revenue).toBe(0);
  });

  it("buckets a year by month", () => {
    const p = parsePeriod({ period: "year", year: "2026" }, "month", TODAY);
    const series = buildPeriodSeries([tx("REVENUE", 1000, "2026-11-02"), tx("REVENUE", 200, "2026-12-30")], p);
    expect(series.map((s) => s.month)).toHaveLength(12);
    expect(series[10]).toMatchObject({ month: "2026-11", revenue: 1000 });
    expect(series[11]).toMatchObject({ month: "2026-12", revenue: 200 });
  });
});

describe("buildCapitalPosition", () => {
  it("has nothing left to recover when nothing was deployed, even at a loss", () => {
    const position = buildCapitalPosition([tx("EXPENSE", 25_000, "2026-11-10")]);
    expect(position.totalFundsDeployed).toBe(0);
    expect(position.remainingToRecover).toBe(0);
  });
});
