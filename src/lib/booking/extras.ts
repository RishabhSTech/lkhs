import { z } from "zod";

/**
 * Extra income a booking brings in on top of the stay itself - an extra
 * mattress, a guest we passed to another flat, anything else we charged for.
 * Plain module (no DB) so the booking form, the API routes and the finance
 * posting all share one list.
 */
export const EXTRA_KINDS = ["OTHER_FLAT_BOOKING", "MATTRESS", "OTHER"] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];

export const EXTRA_LABELS: Record<ExtraKind, string> = {
  OTHER_FLAT_BOOKING: "Booking in another flat",
  MATTRESS: "Extra mattress",
  OTHER: "Other extra",
};

/** The Finance "Revenue" category each kind is posted under. */
export const EXTRA_CATEGORY: Record<ExtraKind, string> = {
  OTHER_FLAT_BOOKING: "Other Flat Booking",
  MATTRESS: "Extra Mattress",
  OTHER: "Other Extras",
};

export const extraSchema = z.object({
  kind: z.enum(EXTRA_KINDS),
  description: z.string().trim().max(200).optional(),
  amount: z.number().positive("Enter an amount for each extra, or remove it."),
});

export type ExtraInput = z.infer<typeof extraSchema>;

export function sumExtras(extras: { amount: number | { toString(): string } }[]): number {
  return extras.reduce((total, e) => total + Number(e.amount), 0);
}
