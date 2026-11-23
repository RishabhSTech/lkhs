import type { ExpensePayer } from "@prisma/client";

/** People who can pay for an expense personally and be reimbursed. */
export const PAYERS: { value: ExpensePayer; label: string }[] = [
  { value: "AASHISH", label: "Aashish" },
  { value: "RISHABH", label: "Rishabh" },
  { value: "PIYA", label: "Piya" },
];

export const PAYER_LABELS = Object.fromEntries(PAYERS.map((p) => [p.value, p.label])) as Record<ExpensePayer, string>;

export const PAYER_VALUES = PAYERS.map((p) => p.value) as [ExpensePayer, ...ExpensePayer[]];

export function isPayer(value: unknown): value is ExpensePayer {
  return typeof value === "string" && (PAYER_VALUES as string[]).includes(value);
}
