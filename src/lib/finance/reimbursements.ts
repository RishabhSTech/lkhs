import "server-only";
import type { ExpensePayer, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PAYERS } from "@/lib/finance/payers";

const EXPENSE_TYPES = ["EXPENSE", "INVESTMENT", "DEPOSIT_OUT"] as const;

/**
 * What a person is owed: expenses they paid personally, not yet paid back.
 * Expenses still waiting for approval aren't owed until finance approves
 * them. Every property counts - a hidden property's bills are still real.
 */
export function owedWhere(payer: ExpensePayer): Prisma.TransactionWhereInput {
  return {
    type: { in: [...EXPENSE_TYPES] },
    paidBy: payer,
    reimbursedAt: null,
    status: { not: "PENDING" },
  };
}

export type ReimbursementSummary = {
  payer: ExpensePayer;
  label: string;
  owed: number;
  owedCount: number;
  owedIds: string[];
  /** Paid personally but still waiting for approval. */
  awaitingApproval: number;
};

export async function getReimbursementSummary(): Promise<ReimbursementSummary[]> {
  const [owed, pending] = await Promise.all([
    db.transaction.findMany({
      where: { OR: PAYERS.map((p) => owedWhere(p.value)) },
      select: { id: true, paidBy: true, amount: true },
    }),
    db.transaction.groupBy({
      by: ["paidBy"],
      where: { type: { in: [...EXPENSE_TYPES] }, paidBy: { not: null }, reimbursedAt: null, status: "PENDING" },
      _sum: { amount: true },
    }),
  ]);
  return PAYERS.map(({ value, label }) => {
    const mine = owed.filter((t) => t.paidBy === value);
    return {
      payer: value,
      label,
      owed: mine.reduce((s, t) => s + Number(t.amount), 0),
      owedCount: mine.length,
      owedIds: mine.map((t) => t.id),
      awaitingApproval: Number(pending.find((g) => g.paidBy === value)?._sum.amount ?? 0),
    };
  });
}
