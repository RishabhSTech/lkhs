"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, Info, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/format";

type Category = {
  id: string;
  name: string;
  group: string;
  isRefundableDeposit: boolean;
};

const GROUP_LABELS: Record<string, string> = {
  INITIAL_INVESTMENT: "Initial investment / setup",
  RECURRING_EXPENSE: "Recurring expense",
  ONE_TIME_EXPENSE: "One-time operational",
  DEPOSIT: "Refundable deposit",
};

export function ExpenseForm({
  properties,
  categories,
  defaultPropertyId,
}: {
  properties: { id: string; name: string }[];
  categories: Category[];
  defaultPropertyId?: string;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(
    defaultPropertyId ?? properties[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [frequency, setFrequency] = useState("ONE_TIME");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [status, setStatus] = useState("PAID");
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Category[]>();
    for (const c of categories) {
      map.set(c.group, [...(map.get(c.group) ?? []), c]);
    }
    return map;
  }, [categories]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!categoryId) return setError("Pick a category.");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return setError("Enter an amount greater than zero.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          categoryId,
          amount: numericAmount,
          date,
          frequency,
          description,
          paymentMethod,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the expense.");

      toast.success("Expense recorded", {
        description: `${formatINR(numericAmount)} against ${
          properties.find((p) => p.id === propertyId)?.name
        }`,
      });
      router.push("/admin/finance/expenses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the expense.");
      setSubmitting(false);
    }
  }

  const selectClass =
    "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Property" required>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className={selectClass}
            required
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Category" required>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={selectClass}
            required
          >
            <option value="">Select a category…</option>
            {[...grouped.entries()].map(([group, items]) => (
              <optgroup key={group} label={GROUP_LABELS[group] ?? group}>
                {items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <Field label="Amount (₹)" required>
          <Input
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="30000"
            required
          />
        </Field>

        <Field label="Date" required>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Frequency">
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className={selectClass}
          >
            <option value="ONE_TIME">One-time</option>
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </Field>

        <Field label="Payment method">
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={selectClass}
          >
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>

        <Field label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="APPROVED">Approved</option>
          </select>
        </Field>

        <Field label="Receipt">
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-muted-foreground transition-colors hover:border-brand-sage">
            <Upload className="size-4" />
            <span className="truncate">
              {receiptName ?? "Attach invoice or photo"}
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
        </Field>
      </div>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
          rows={3}
        />
      </Field>

      {selectedCategory?.isRefundableDeposit && (
        <p className="flex items-start gap-2 rounded-lg bg-chart-3/8 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-chart-3" />
          Refundable deposits are recorded as capital tied up, not as an expense
          — this will count towards funds deployed but will not reduce net
          operating income.
        </p>
      )}

      {selectedCategory?.group === "INITIAL_INVESTMENT" && (
        <p className="flex items-start gap-2 rounded-lg bg-chart-3/8 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-chart-3" />
          Setup costs are recorded as investment. They increase funds deployed
          and affect capital recovery, not the monthly P&L.
        </p>
      )}

      {receiptName && (
        <p className="text-xs text-muted-foreground">
          Receipt uploads need object storage configured (MinIO / S3). The file
          name is captured but the file is not stored in this environment.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Save expense
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {required && <span className="text-brand-terracotta"> *</span>}
      </Label>
      {children}
    </div>
  );
}
