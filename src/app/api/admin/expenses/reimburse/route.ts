import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guardApi } from "@/lib/auth/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";
import { formatINR } from "@/lib/format";
import { PAYER_LABELS, PAYER_VALUES } from "@/lib/finance/payers";
import { owedWhere } from "@/lib/finance/reimbursements";

const schema = z.object({
  payer: z.enum(PAYER_VALUES),
  /** The expenses the person saw on screen - only those get marked. */
  ids: z.array(z.string().min(1)).min(1).max(500),
});

/** Marks everything currently owed to one person as paid back. */
export async function POST(request: Request) {
  const auth = await guardApi(FINANCE_ROLES, "Only finance can record reimbursements.");
  if ("error" in auth) return auth.error;
  if (auth.scope) return NextResponse.json({ error: "Reimbursements cover the whole portfolio." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick who to reimburse." }, { status: 400 });
  }
  const { payer, ids } = parsed.data;

  // Re-checked here so an expense edited or already settled in the meantime
  // is never marked by accident.
  const where = { ...owedWhere(payer), id: { in: ids } };
  const owed = await db.transaction.aggregate({ where, _sum: { amount: true }, _count: { _all: true } });
  if (owed._count._all === 0) {
    return NextResponse.json({ error: `Nothing is owed to ${PAYER_LABELS[payer]} right now.` }, { status: 409 });
  }
  const amount = Number(owed._sum.amount ?? 0);

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.transaction.updateMany({ where, data: { reimbursedAt: new Date() } });
    await tx.auditLog.create({
      data: {
        userId: auth.user.id,
        userName: auth.user.name,
        action: "EXPENSE_REIMBURSED",
        entityType: "Transaction",
        summary: `${formatINR(amount)} reimbursed to ${PAYER_LABELS[payer]} (${updated.count} expenses)`,
        metadata: { payer, ids },
      },
    });
    return updated;
  });

  return NextResponse.json({ count: result.count, amount });
}
