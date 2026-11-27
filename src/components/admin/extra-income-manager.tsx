"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/site/empty-state";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import {
  ChipGroup, Field, FormError, NativeSelect, fieldControlClass, parseAmount, todayISO,
} from "@/components/admin/form-fields";
import { EXTRA_INCOME_LABELS, EXTRA_INCOME_TYPES, type ExtraIncomeType } from "@/lib/finance/extra-income";
import { formatDateLong, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ExtraIncomeRow = {
  id: string;
  propertyId: string;
  propertyName: string;
  type: ExtraIncomeType;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string | null;
  paymentMethod: string;
};

const FORM_ID = "extra-income-form";

const PAYMENT_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank" },
  { value: "OTHER", label: "Other" },
];

export function ExtraIncomeManager({
  rows,
  properties,
  total,
}: {
  rows: ExtraIncomeRow[];
  properties: { id: string; name: string }[];
  total: number;
}) {
  const [sheet, setSheet] = useState<{ open: boolean; session: number; entry: ExtraIncomeRow | null }>({
    open: false,
    session: 0,
    entry: null,
  });
  const [saving, setSaving] = useState(false);

  const show = (entry: ExtraIncomeRow | null) => setSheet((s) => ({ open: true, session: s.session + 1, entry }));

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => show(null)} disabled={properties.length === 0}>
          <Plus />
          Add extra income
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No extra income in this period"
            description="Add a mattress we charged for, or a booking we gave to another flat."
          />
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border overflow-hidden soft-card">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => show(r)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-semibold text-foreground">
                      {EXTRA_INCOME_LABELS[r.type]}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {formatDateLong(r.date)} · {r.propertyName}
                    </span>
                    {r.description && (
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{r.description}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatINR(r.amount)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-right text-sm text-muted-foreground">
            Total <span className="font-semibold tabular-nums text-foreground">{formatINR(total)}</span>
          </p>
        </>
      )}

      <ResponsiveSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        title={sheet.entry ? "Edit extra income" : "Add extra income"}
        description="Counts as income in Finance. No booking is created."
        footer={
          <Button type="submit" form={FORM_ID} size="lg" className="w-full lg:h-10" disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            {sheet.entry ? "Save changes" : "Save"}
          </Button>
        }
      >
        <ExtraIncomeForm
          key={sheet.session}
          entry={sheet.entry}
          properties={properties}
          onSaving={setSaving}
          onDone={() => setSheet((s) => ({ ...s, open: false }))}
        />
      </ResponsiveSheet>
    </>
  );
}

function ExtraIncomeForm({
  entry,
  properties,
  onSaving,
  onDone,
}: {
  entry: ExtraIncomeRow | null;
  properties: { id: string; name: string }[];
  onSaving: (saving: boolean) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [type, setType] = useState<ExtraIncomeType>(entry?.type ?? "OTHER_FLAT_BOOKING");
  const [propertyId, setPropertyId] = useState(entry?.propertyId ?? (properties.length === 1 ? properties[0].id : ""));
  const [amount, setAmount] = useState(entry ? String(entry.amount) : "");
  const [date, setDate] = useState(entry?.date ?? todayISO());
  const [description, setDescription] = useState(entry?.description ?? "");
  const [paymentMethod, setPaymentMethod] = useState(entry?.paymentMethod ?? "CASH");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const value = parseAmount(amount);
    if (!propertyId) return setError("Pick the property.");
    if (!(value > 0)) return setError("Enter how much we earned.");
    if (!date) return setError("Pick the date.");

    onSaving(true);
    try {
      const res = await fetch(entry ? `/api/admin/extra-income/${entry.id}` : "/api/admin/extra-income", {
        method: entry ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          type,
          amount: value,
          date,
          description: description.trim() || undefined,
          paymentMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save that.");
      toast.success(entry ? "Extra income updated" : "Extra income added");
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      onSaving(false);
    }
  }

  async function remove() {
    if (!entry || !window.confirm("Delete this entry? It comes off Finance.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/extra-income/${entry.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not delete that.");
      toast.success("Entry deleted");
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5">
      <Field label="What was it for?">
        <ChipGroup
          ariaLabel="Type of extra income"
          value={type}
          onChange={setType}
          options={EXTRA_INCOME_TYPES.map((t) => ({ value: t, label: EXTRA_INCOME_LABELS[t] }))}
        />
      </Field>

      <Field label="Which property?" required hint="The property the guest was staying with, or the item came from.">
        <NativeSelect value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
          <option value="">Choose property…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Amount we earned (₹)" required>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="500"
          className={cn(fieldControlClass, "text-lg font-semibold tabular-nums")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldControlClass} />
        </Field>
        <Field label="Received by">
          <NativeSelect value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field
        label="Note"
        hint={type === "OTHER_FLAT_BOOKING" ? "Which flat, and who the guest was." : "Optional."}
      >
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={300}
          placeholder={type === "OTHER_FLAT_BOOKING" ? "e.g. Sharma family, flat 4B Sector 21" : "e.g. 2 mattresses for 2 nights"}
          className={fieldControlClass}
        />
      </Field>

      <FormError>{error}</FormError>

      {entry && (
        <Button type="button" variant="ghost" onClick={remove} disabled={deleting} className="text-destructive">
          {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Delete this entry
        </Button>
      )}
    </form>
  );
}
