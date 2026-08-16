import type { PricingRule } from "@prisma/client";
import { eachNight, isWeekendNight, toISODate } from "@/lib/dates";

export type NightPrice = {
  date: string;
  basePrice: number;
  price: number;
  appliedRules: string[];
};

export type QuoteInput = {
  basePrice: number;
  cleaningFee: number;
  checkIn: Date;
  checkOut: Date;
  rules: PricingRule[];
  /** Explicit per-date overrides keyed by ISO date; these win over rules. */
  dailyRateOverrides?: Record<string, number>;
  taxRate?: number;
};

export type Quote = {
  nights: NightPrice[];
  nightCount: number;
  subtotal: number;
  averageNightlyRate: number;
  cleaningFee: number;
  discount: number;
  taxes: number;
  total: number;
};

const GST_RATE = 0.12;

function ruleApplies(
  rule: PricingRule,
  night: Date,
  nightCount: number,
  daysUntilCheckIn: number,
): boolean {
  if (!rule.isActive) return false;

  const withinWindow =
    (!rule.startDate || night >= new Date(rule.startDate)) &&
    (!rule.endDate || night <= new Date(rule.endDate));

  switch (rule.type) {
    case "WEEKEND":
      return isWeekendNight(night);
    case "FRIDAY":
      return night.getUTCDay() === 5;
    case "SATURDAY":
      return night.getUTCDay() === 6;
    case "HOLIDAY":
    case "HIGH_DEMAND":
    case "CUSTOM_RANGE":
      return Boolean(rule.startDate && rule.endDate) && withinWindow;
    case "LONG_STAY":
      return nightCount >= (rule.minNights ?? 7);
    case "LAST_MINUTE":
      return daysUntilCheckIn <= (rule.minNights ?? 3);
    default:
      return false;
  }
}

function applyAdjustment(price: number, rule: PricingRule): number {
  const value = Number(rule.adjustmentValue);
  return rule.adjustmentType === "PERCENT"
    ? price + (price * value) / 100
    : price + value;
}

/**
 * Prices each night independently: explicit DailyRate overrides win outright,
 * otherwise active rules stack in priority order on top of the base price.
 */
export function buildQuote({
  basePrice,
  cleaningFee,
  checkIn,
  checkOut,
  rules,
  dailyRateOverrides = {},
  taxRate = GST_RATE,
}: QuoteInput): Quote {
  const nightDates = eachNight(checkIn, checkOut);
  const nightCount = nightDates.length;
  const daysUntilCheckIn = Math.max(
    0,
    Math.round((checkIn.getTime() - Date.now()) / 86_400_000),
  );

  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  const nights: NightPrice[] = nightDates.map((night) => {
    const iso = toISODate(night);
    const override = dailyRateOverrides[iso];

    if (override !== undefined) {
      return {
        date: iso,
        basePrice,
        price: override,
        appliedRules: ["Custom rate"],
      };
    }

    let price = basePrice;
    const appliedRules: string[] = [];

    for (const rule of sortedRules) {
      if (ruleApplies(rule, night, nightCount, daysUntilCheckIn)) {
        price = applyAdjustment(price, rule);
        appliedRules.push(rule.name);
      }
    }

    return { date: iso, basePrice, price: Math.round(price), appliedRules };
  });

  const grossSubtotal = nights.reduce((sum, n) => sum + n.price, 0);
  const undiscounted = nights.reduce(
    (sum, n) => sum + Math.max(n.price, n.basePrice),
    0,
  );
  const discount = Math.max(0, undiscounted - grossSubtotal);

  const taxes = Math.round((grossSubtotal + cleaningFee) * taxRate);
  const total = grossSubtotal + cleaningFee + taxes;

  return {
    nights,
    nightCount,
    subtotal: grossSubtotal,
    averageNightlyRate: nightCount ? Math.round(grossSubtotal / nightCount) : 0,
    cleaningFee,
    discount,
    taxes,
    total,
  };
}
