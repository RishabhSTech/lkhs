"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExpensePayer } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@/components/admin/navigation-progress";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ReimbursementCard = {
  payer: ExpensePayer;
  label: string;
  owed: number;
  owedCount: number;
  owedIds: string[];
  awaitingApproval: number;
};

/**
 * What each person is owed for expenses they paid themselves. Tap a card to
 * see those expenses; "Mark all reimbursed" settles the lot once you've paid
 * them back.
 */
export function ReimbursementPanel({
  summary,
  active,
}: {
  summary: ReimbursementCard[];
  /** The payer whose owed expenses are being listed. */
  active?: ExpensePayer;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigate();
  const [busy, setBusy] = useState<ExpensePayer | null>(null);

  function show(payer: ExpensePayer | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("paidBy");
    params.delete("owed");
    if (payer) {
      params.set("paidBy", payer);
      params.set("owed", "1");
    }
    const qs = params.toString();
    navigate(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  async function settle(card: ReimbursementCard) {
    if (
      !window.confirm(
        `Mark ${formatINR(card.owed)} as reimbursed to ${card.label}? (${card.owedCount} ${
          card.owedCount === 1 ? "expense" : "expenses"
        })`,
      )
    ) {
      return;
    }
    setBusy(card.payer);
    try {
      const res = await fetch("/api/admin/expenses/reimburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payer: card.payer, ids: card.owedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "That didn't work.");
      toast.success(`${formatINR(data.amount)} reimbursed to ${card.label}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  }

  const totalOwed = summary.reduce((s, c) => s + c.owed, 0);

  return (
    <section aria-labelledby="reimbursements-heading">
      <div className="flex items-baseline justify-between gap-3 px-1 pb-2">
        <h2 id="reimbursements-heading" className="text-sm font-semibold text-foreground">
          Reimbursements
        </h2>
        <span className="text-xs text-muted-foreground">
          {totalOwed > 0 ? `${formatINR(totalOwed)} owed in total` : "Everyone is paid back"}
        </span>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-3">
        {summary.map((card) => {
          const isActive = active === card.payer;
          return (
            <li
              key={card.payer}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-4 transition-colors",
                isActive ? "border-brand-blue ring-1 ring-brand-blue" : "border-border",
              )}
            >
              <button
                type="button"
                onClick={() => show(isActive ? null : card.payer)}
                aria-pressed={isActive}
                className="-m-1 rounded-lg p-1 text-left"
              >
                <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {card.label} is owed
                </span>
                <span
                  className={cn(
                    "mt-1 block text-2xl font-semibold tabular-nums",
                    card.owed > 0 ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatINR(card.owed)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {card.owedCount > 0
                    ? `${card.owedCount} ${card.owedCount === 1 ? "expense" : "expenses"} · ${isActive ? "showing below" : "tap to view"}`
                    : "Nothing outstanding"}
                  {card.awaitingApproval > 0 && ` · ${formatINR(card.awaitingApproval)} awaiting approval`}
                </span>
              </button>
              {card.owed > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-3 self-start"
                  disabled={busy !== null}
                  onClick={() => settle(card)}
                >
                  {busy === card.payer ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                  Mark all reimbursed
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
