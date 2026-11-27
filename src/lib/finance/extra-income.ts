import { z } from "zod";

/**
 * Extra income: money we earn that isn't a guest's stay in one of our flats -
 * a booking we pass to someone else's flat, a mattress or other item we charge
 * for. Recorded on its own (no booking, no stay dates) and posted to Finance
 * as REVENUE under its own category. Plain module so the form, the API and the
 * page share one list.
 */
export const EXTRA_INCOME_TYPES = ["OTHER_FLAT_BOOKING", "MATTRESS", "OTHER"] as const;
export type ExtraIncomeType = (typeof EXTRA_INCOME_TYPES)[number];

export const EXTRA_INCOME_LABELS: Record<ExtraIncomeType, string> = {
  OTHER_FLAT_BOOKING: "Booking given to another flat",
  MATTRESS: "Extra mattress",
  OTHER: "Other item",
};

/** The Finance "Revenue" category each type is posted under. */
export const EXTRA_INCOME_CATEGORY: Record<ExtraIncomeType, string> = {
  OTHER_FLAT_BOOKING: "Other Flat Booking",
  MATTRESS: "Extra Mattress",
  OTHER: "Other Extras",
};

export const EXTRA_INCOME_CATEGORY_NAMES: string[] = Object.values(EXTRA_INCOME_CATEGORY);

export function extraIncomeTypeOf(categoryName: string): ExtraIncomeType | null {
  return EXTRA_INCOME_TYPES.find((t) => EXTRA_INCOME_CATEGORY[t] === categoryName) ?? null;
}

export const extraIncomeSchema = z.object({
  propertyId: z.string().min(1, "Pick the property."),
  type: z.enum(EXTRA_INCOME_TYPES),
  amount: z.number().positive("Amount must be greater than zero."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date."),
  description: z.string().trim().max(300).optional(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "OTHER"]).default("CASH"),
});
