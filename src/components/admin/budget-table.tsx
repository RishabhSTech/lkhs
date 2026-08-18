import { AlertTriangle } from "lucide-react";
import type { BudgetVariance } from "@/lib/finance/calculations";
import { formatINR } from "@/lib/format";
import { BudgetForm } from "@/components/admin/budget-form";

export function BudgetTable({
  budgets,
  propertyId,
  categories,
}: {
  budgets: BudgetVariance[];
  propertyId: string;
  categories: { id: string; name: string }[];
}) {
  const overCount = budgets.filter((b) => b.isOverBudget).length;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Budget vs actual
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">This month</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {overCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <AlertTriangle className="size-3" />
              {overCount} over
            </span>
          )}
          <BudgetForm propertyId={propertyId} categories={categories} />
        </div>
      </div>

      {budgets.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No budgets set for this month.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {budgets.map((b) => {
            const pct = b.budget > 0 ? Math.min(150, (b.actual / b.budget) * 100) : 0;
            return (
              <li key={b.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-foreground">{b.category}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <span
                      className={
                        b.isOverBudget
                          ? "font-medium text-destructive"
                          : "font-medium text-foreground"
                      }
                    >
                      {formatINR(b.actual)}
                    </span>
                    {" / "}
                    {formatINR(b.budget)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      b.isOverBudget
                        ? "h-full rounded-full bg-destructive"
                        : "h-full rounded-full bg-chart-1"
                    }
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
