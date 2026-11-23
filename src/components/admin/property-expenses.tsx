"use client";

import { Paperclip, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuickAdd } from "@/components/admin/quick-add";
import type { ExpenseRecord } from "@/components/admin/expense-sheet";
import { formatDateLong, formatINR } from "@/lib/format";
import { PAYER_LABELS } from "@/lib/finance/payers";

export type PropertyExpenseRow = ExpenseRecord & { categoryName: string; type: string };

const TYPE_LABELS: Record<string, string> = { INVESTMENT: "Investment", DEPOSIT_OUT: "Deposit" };

function statusClass(status: string) {
  if (status === "PAID" || status === "APPROVED") return "border-chart-1/25 bg-chart-1/10 text-chart-1";
  if (status === "PENDING") return "border-chart-4/25 bg-chart-4/10 text-chart-4";
  return "border-destructive/25 bg-destructive/10 text-destructive";
}

/** Every expense dated in the selected period for one property; tap to open. */
export function PropertyExpenses({
  propertyId,
  periodLabel,
  expenses,
  channelFees,
}: {
  propertyId: string;
  periodLabel: string;
  expenses: PropertyExpenseRow[];
  /** OTA + payment fees in the period, shown for reconciliation. */
  channelFees: number;
}) {
  const { openExpense } = useQuickAdd();
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Expenses</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {periodLabel} · {expenses.length} {expenses.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openExpense({ propertyId })}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-azure hover:underline"
        >
          <Plus className="size-3.5" />
          Add
        </button>
      </div>

      {expenses.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">No expenses recorded in this period.</p>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border">
            {expenses.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => openExpense({ propertyId, expense: e })}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                >
                  <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDateLong(e.date)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">{e.categoryName}</span>
                      {e.receiptUrl && <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-label="Has receipt" />}
                    </span>
                    {e.description && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">{e.description}</span>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatINR(e.amount)}</span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {e.paidBy && (
                        <Badge
                          className={
                            e.reimbursedAt
                              ? "border-border bg-muted text-muted-foreground"
                              : "border-chart-3/25 bg-chart-3/10 text-chart-3"
                          }
                        >
                          {PAYER_LABELS[e.paidBy]} · {e.reimbursedAt ? "reimbursed" : "owed"}
                        </Badge>
                      )}
                      {TYPE_LABELS[e.type] && (
                        <Badge className="border-border bg-muted text-muted-foreground">{TYPE_LABELS[e.type]}</Badge>
                      )}
                      <Badge className={statusClass(e.status)}>{e.status.toLowerCase()}</Badge>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-border bg-muted/40 px-5 py-3">
            <span className="text-sm font-semibold text-foreground">
              Total
              {channelFees > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Channel fees of {formatINR(channelFees)} are counted in the P&amp;L, not listed here
                </span>
              )}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{formatINR(total)}</span>
          </div>
        </>
      )}
    </section>
  );
}
