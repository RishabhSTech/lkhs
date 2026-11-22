import {
  addDays, addMonths, endOfMonthUTC, parseISODate, startOfMonthUTC, toISODate, todayUTC,
} from "@/lib/dates";

/**
 * The reporting window behind Finance and Analytics. Lives in the URL
 * (?period=month&month=2026-11 | ?period=year&year=2026 |
 * ?period=custom&from=2026-11-01&to=2026-11-15) so views can be refreshed,
 * bookmarked and shared, and so exports cover exactly what is on screen.
 */
export type PeriodKind = "month" | "year" | "custom";

export type Period = {
  kind: PeriodKind;
  /** First day, UTC midnight. */
  from: Date;
  /** Last day, inclusive, UTC midnight. */
  to: Date;
  /** Chart bucket size: days for short windows, months otherwise. */
  bucket: "day" | "month";
  label: string;
};

/** Longest window charted day-by-day; anything longer is charted by month. */
const MAX_DAILY_BUCKETS = 62;
/** Guards against absurd custom ranges (and the work they would trigger). */
const MAX_CUSTOM_DAYS = 366 * 5;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string) {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

function validDate(value: string | undefined) {
  if (!value || !ISO_DATE.test(value)) return null;
  const d = parseISODate(value);
  return toISODate(d) === value ? d : null; // rejects 2026-02-31
}

const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
const dayLabel = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function monthPeriod(anyDayInMonth: Date): Period {
  const from = startOfMonthUTC(anyDayInMonth);
  return { kind: "month", from, to: endOfMonthUTC(from), bucket: "day", label: monthLabel(from) };
}

export function yearPeriod(year: number): Period {
  return {
    kind: "year",
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year, 11, 31)),
    bucket: "month",
    label: String(year),
  };
}

export function customPeriod(from: Date, to: Date): Period {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const end = dayCount(a, b) > MAX_CUSTOM_DAYS ? addDays(a, MAX_CUSTOM_DAYS - 1) : b;
  return {
    kind: "custom",
    from: a,
    to: end,
    bucket: dayCount(a, end) <= MAX_DAILY_BUCKETS ? "day" : "month",
    label: `${dayLabel(a)} – ${dayLabel(end)}`,
  };
}

export function parsePeriod(params: Params, fallback: PeriodKind = "month", today = todayUTC()): Period {
  const kind = one(params, "period");

  if (kind === "custom") {
    const from = validDate(one(params, "from"));
    const to = validDate(one(params, "to"));
    if (from && to) return customPeriod(from, to);
  }
  if (kind === "year") {
    const year = Number(one(params, "year"));
    if (Number.isInteger(year) && year >= 2000 && year <= 2100) return yearPeriod(year);
    return yearPeriod(today.getUTCFullYear());
  }
  if (kind === "month") {
    const m = one(params, "month");
    if (m && ISO_MONTH.test(m)) {
      const d = validDate(`${m}-01`);
      if (d) return monthPeriod(d);
    }
    return monthPeriod(today);
  }
  return fallback === "year" ? yearPeriod(today.getUTCFullYear()) : monthPeriod(today);
}

/** Search params that reproduce this period (for links and exports). */
export function periodParams(period: Period): Record<string, string> {
  if (period.kind === "month") return { period: "month", month: toISODate(period.from).slice(0, 7) };
  if (period.kind === "year") return { period: "year", year: String(period.from.getUTCFullYear()) };
  return { period: "custom", from: toISODate(period.from), to: toISODate(period.to) };
}

export function periodQuery(period: Period) {
  return new URLSearchParams(periodParams(period)).toString();
}

export function dayCount(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
}

/** Bucket start dates covering the period, in order. */
export function periodBuckets(period: Period): Date[] {
  const out: Date[] = [];
  if (period.bucket === "day") {
    for (let d = period.from; d <= period.to; d = addDays(d, 1)) out.push(d);
  } else {
    for (let d = startOfMonthUTC(period.from); d <= period.to; d = addMonths(d, 1)) out.push(d);
  }
  return out;
}

/** "2026-11-23" for day buckets, "2026-11" for month buckets. */
export function bucketKey(date: Date, bucket: Period["bucket"]) {
  const iso = toISODate(date);
  return bucket === "day" ? iso : iso.slice(0, 7);
}

/** Prisma `date` filter for the period. */
export function periodDateFilter(period: Period) {
  return { gte: period.from, lte: period.to };
}
