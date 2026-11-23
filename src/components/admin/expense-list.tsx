"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Paperclip, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { NativeSelect } from "@/components/admin/form-fields";
import { useQuickAdd } from "@/components/admin/quick-add";
import { useNavigate } from "@/components/admin/navigation-progress";
import type { ExpenseRecord } from "@/components/admin/expense-sheet";
import { formatDateLong, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ExpenseRow = ExpenseRecord & {
  propertyName: string;
  categoryName: string;
  type: string;
};

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Expense",
  INVESTMENT: "Investment",
  DEPOSIT_OUT: "Deposit",
};
const PAYMENT_LABELS: Record<string, string> = {
  UPI: "UPI",
  CASH: "Cash",
  BANK_TRANSFER: "Bank",
  CARD: "Card",
  OTHER: "Other",
};

function statusClass(status: string) {
  switch (status) {
    case "PAID":
    case "APPROVED":
      return "border-chart-1/25 bg-chart-1/10 text-chart-1";
    case "PENDING":
      return "border-chart-4/25 bg-chart-4/10 text-chart-4";
    default:
      return "border-destructive/25 bg-destructive/10 text-destructive";
  }
}

export function ExpenseList({
  expenses,
  properties,
  filters,
  pendingCount,
  showFilters,
}: {
  expenses: ExpenseRow[];
  properties: { id: string; name: string }[];
  filters: { propertyId?: string; status?: string };
  pendingCount: number;
  showFilters: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openExpense } = useQuickAdd();
  const { navigate } = useNavigate();

  // ?add=1 (home-screen shortcut, old "new expense" links) opens the form.
  const handledAdd = useRef(false);
  useEffect(() => {
    if (handledAdd.current || searchParams.get("add") !== "1") return;
    handledAdd.current = true;
    openExpense({ propertyId: filters.propertyId });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("add");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }, [searchParams, openExpense, filters.propertyId, router, pathname]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    navigate(`${pathname}?${params.toString()}`);
  }

  const statusTabs = [
    { value: "", label: "All" },
    { value: "PENDING", label: `Needs approval${pendingCount ? ` · ${pendingCount}` : ""}` },
    { value: "PAID", label: "Paid" },
    { value: "OVERDUE", label: "Overdue" },
  ];

  // Group by month so a long list scans like a bank statement.
  const groups = new Map<string, ExpenseRow[]>();
  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {statusTabs.map((t) => {
          const active = (filters.status ?? "") === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setParam("status", t.value)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
                active ? "border-brand-blue bg-brand-blue text-white" : "border-border bg-card text-foreground",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {showFilters && properties.length > 1 && (
        <div className="mt-3 max-w-xs">
          <NativeSelect
            value={filters.propertyId ?? ""}
            onChange={(e) => setParam("property", e.target.value)}
            aria-label="Filter by property"
          >
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={filters.status === "PENDING" ? "Nothing waiting for approval" : "No expenses here yet"}
            description="Tap + to log one - snap the receipt and it's done."
          />
          <div className="mt-4 flex justify-center">
            <Button onClick={() => openExpense({ propertyId: filters.propertyId })}>
              <Plus />
              Add expense
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {[...groups].map(([month, rows]) => (
            <section key={month}>
              <div className="flex items-baseline justify-between px-1 pb-2">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </h2>
                <span className="text-xs font-medium tabular-nums text-muted-foreground">
                  {formatINR(rows.reduce((s, r) => s + r.amount, 0))}
                </span>
              </div>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                {rows.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => openExpense({ expense: e })}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-foreground">{e.categoryName}</span>
                          {e.receiptUrl && <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-label="Has receipt" />}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {e.propertyName} · {formatDateLong(e.date)} · {PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod}
                        </span>
                        {e.description && (
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground/80">{e.description}</span>
                        )}
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatINR(e.amount)}</span>
                        <span className="flex gap-1">
                          {e.type !== "EXPENSE" && (
                            <Badge className="border-border bg-muted text-muted-foreground">{TYPE_LABELS[e.type] ?? e.type}</Badge>
                          )}
                          <Badge className={statusClass(e.status)}>{e.status.toLowerCase()}</Badge>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
