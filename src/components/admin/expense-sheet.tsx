"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, FileText, Info, Loader2, Paperclip, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { RoleName } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import {
  ChipGroup, Field, FormError, NativeSelect, parseAmount, todayISO,
} from "@/components/admin/form-fields";
import { FINANCE_ROLES } from "@/lib/auth/roles";
import { formatDateLong, formatINR } from "@/lib/format";
import { safeHttpUrl } from "@/lib/safe-url";

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  group: string;
  isRefundableDeposit: boolean;
};

export type ExpenseRecord = {
  id: string;
  propertyId: string;
  categoryId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  status: string;
  description: string | null;
  receiptUrl: string | null;
  createdById: string | null;
  createdByName: string | null;
};

const GROUP_LABELS: Record<string, string> = {
  ONE_TIME_EXPENSE: "Day-to-day",
  RECURRING_EXPENSE: "Bills & recurring",
  INITIAL_INVESTMENT: "Setup / investment",
  DEPOSIT: "Refundable deposit",
};
const GROUP_ORDER = ["ONE_TIME_EXPENSE", "RECURRING_EXPENSE", "INITIAL_INVESTMENT", "DEPOSIT"];
const STAFF_GROUPS = new Set(["ONE_TIME_EXPENSE", "RECURRING_EXPENSE"]);

const PAYMENT_OPTIONS = [
  { value: "UPI", label: "UPI" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
];
const STATUS_OPTIONS = [
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "OVERDUE", label: "Overdue" },
];
const FREQUENCY_OPTIONS = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const FORM_ID = "expense-sheet-form";

export function ExpenseSheet({
  open,
  onOpenChange,
  session,
  role,
  userId,
  properties,
  categories,
  defaultPropertyId,
  expense,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Bumped on every open so the form starts fresh. */
  session: number;
  role: RoleName;
  userId: string;
  properties: { id: string; name: string }[];
  categories: ExpenseCategoryOption[];
  defaultPropertyId?: string;
  expense?: ExpenseRecord | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "save" | "delete" | "approve" | "paid">(null);
  const isFinance = FINANCE_ROLES.includes(role);
  const isEdit = Boolean(expense);
  const readOnly =
    isEdit && !isFinance && !(expense!.createdById === userId && expense!.status === "PENDING");

  async function mutate(kind: "delete" | "approve" | "paid") {
    if (!expense) return;
    if (kind === "delete" && !window.confirm("Delete this expense? It comes off the property's P&L.")) return;
    setBusy(kind);
    try {
      const res = await fetch(`/api/admin/expenses/${expense.id}`, {
        method: kind === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: kind === "delete" ? undefined : JSON.stringify({ status: kind === "approve" ? "APPROVED" : "PAID" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "That didn't work.");
      toast.success(kind === "delete" ? "Expense deleted" : kind === "approve" ? "Expense approved" : "Marked as paid");
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  }

  const footer = readOnly ? null : (
    <div className="flex gap-2">
      {isEdit && (
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="lg:h-10"
          disabled={busy !== null}
          onClick={() => mutate("delete")}
          aria-label="Delete expense"
        >
          {busy === "delete" ? <Loader2 className="animate-spin" /> : <Trash2 />}
        </Button>
      )}
      <Button type="submit" form={FORM_ID} size="lg" className="flex-1 lg:h-10" disabled={busy !== null}>
        {busy === "save" && <Loader2 className="animate-spin" />}
        {isEdit ? "Save changes" : isFinance ? "Save expense" : "Submit for approval"}
      </Button>
    </div>
  );

  const pendingBanner =
    isEdit && expense!.status === "PENDING" ? (
      <div className="rounded-xl border border-chart-4/25 bg-chart-4/8 p-3">
        <p className="text-sm font-medium text-foreground">Waiting for approval</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Logged by {expense!.createdByName ?? "the team"} · {formatDateLong(expense!.date)}
        </p>
        {isFinance && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="lg" className="lg:h-10" disabled={busy !== null} onClick={() => mutate("approve")}>
              {busy === "approve" ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Approve
            </Button>
            <Button size="lg" variant="outline" className="lg:h-10" disabled={busy !== null} onClick={() => mutate("paid")}>
              {busy === "paid" && <Loader2 className="animate-spin" />}
              Mark paid
            </Button>
          </div>
        )}
      </div>
    ) : null;

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? (readOnly ? "Expense" : "Edit expense") : "Add expense"}
      description={
        isEdit
          ? undefined
          : isFinance
            ? "Counts against the property's P&L straight away."
            : "Finance reviews it before it's marked paid."
      }
      footer={footer}
      size="md"
    >
      <ExpenseFields
        key={session}
        isFinance={isFinance}
        readOnly={readOnly}
        properties={properties}
        categories={categories}
        defaultPropertyId={defaultPropertyId}
        expense={expense ?? null}
        banner={pendingBanner}
        onSaving={(saving) => setBusy(saving ? "save" : null)}
        onSaved={() => {
          onOpenChange(false);
          router.refresh();
        }}
      />
    </ResponsiveSheet>
  );
}

function ExpenseFields({
  isFinance,
  readOnly,
  properties,
  categories,
  defaultPropertyId,
  expense,
  banner,
  onSaving,
  onSaved,
}: {
  isFinance: boolean;
  readOnly: boolean;
  properties: { id: string; name: string }[];
  categories: ExpenseCategoryOption[];
  defaultPropertyId?: string;
  expense: ExpenseRecord | null;
  banner: React.ReactNode;
  onSaving: (saving: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [propertyId, setPropertyId] = useState(
    expense?.propertyId ?? defaultPropertyId ?? (properties.length === 1 ? properties[0].id : ""),
  );
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "");
  const [date, setDate] = useState(expense?.date ?? todayISO());
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod ?? "UPI");
  const [status, setStatus] = useState(expense?.status ?? "PAID");
  const [frequency, setFrequency] = useState("ONE_TIME");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receiptUrl ?? null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = useMemo(
    () => categories.filter((c) => isFinance || STAFF_GROUPS.has(c.group) || c.id === expense?.categoryId),
    [categories, isFinance, expense?.categoryId],
  );
  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((g) => [g, allowed.filter((c) => c.group === g)] as const).filter(
        ([, items]) => items.length > 0,
      ),
    [allowed],
  );
  const category = categories.find((c) => c.id === categoryId);

  async function uploadReceipt(file: File | undefined) {
    if (!file) return;
    // Some phones hand over camera files with no type; infer it from the name.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const contentType =
      file.type ||
      ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", pdf: "application/pdf" } as Record<string, string>)[ext] ||
      "";
    if (!contentType) {
      toast.error("Use a photo or a PDF for the receipt.");
      return;
    }
    setUploading(true);
    setReceiptName(file.name);
    try {
      const presign = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "receipts", filename: file.name, contentType }),
      });
      const presignData = await presign.json();
      if (!presign.ok) throw new Error(presignData.error ?? "Could not start the upload.");
      const put = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: file,
      });
      if (!put.ok) throw new Error("The upload didn't go through.");
      setReceiptUrl(presignData.publicUrl);
    } catch (err) {
      setReceiptName(null);
      toast.error(err instanceof Error ? err.message : "Receipt upload failed.", {
        description: "You can still save the expense without it.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    setError(null);
    const value = parseAmount(amount);
    if (!(value > 0)) return setError("Enter how much was spent.");
    if (!propertyId) return setError("Pick the property this was for.");
    if (!categoryId) return setError("Pick a category.");
    if (uploading) return setError("Hang on - the receipt is still uploading.");

    onSaving(true);
    try {
      const res = await fetch(expense ? `/api/admin/expenses/${expense.id}` : "/api/admin/expenses", {
        method: expense ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          categoryId,
          amount: value,
          date,
          description,
          paymentMethod,
          receiptUrl: expense ? receiptUrl : receiptUrl ?? undefined,
          ...(isFinance ? { status } : {}),
          ...(!expense && isFinance ? { frequency } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the expense.");
      toast.success(expense ? "Expense updated" : isFinance ? "Expense recorded" : "Sent for approval", {
        description: `${formatINR(value)} · ${properties.find((p) => p.id === propertyId)?.name ?? ""}`,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the expense.");
    } finally {
      onSaving(false);
    }
  }

  const safeReceipt = safeHttpUrl(receiptUrl);
  const isImage = safeReceipt && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(safeReceipt);

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-5">
      {banner}

      <fieldset disabled={readOnly} className="space-y-5">
        <div className="rounded-2xl bg-muted/60 px-4 py-4">
          <label htmlFor="expense-amount" className="text-xs font-semibold text-muted-foreground">
            Amount
          </label>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-semibold text-muted-foreground">₹</span>
            <input
              id="expense-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              className="w-full min-w-0 bg-transparent text-4xl font-semibold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Property" required>
            <NativeSelect value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Choose property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Category" required>
            <NativeSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">What was it for?</option>
              {grouped.map(([group, items]) => (
                <optgroup key={group} label={GROUP_LABELS[group] ?? group}>
                  {items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 text-base lg:h-10 lg:text-sm" />
          </Field>
        </div>

        <Field label="Paid via">
          <ChipGroup ariaLabel="Payment method" value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_OPTIONS} />
        </Field>

        {isFinance && (
          <Field label="Status">
            <ChipGroup ariaLabel="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </Field>
        )}

        {isFinance && !expense && (
          <Field
            label="Repeats"
            hint={frequency !== "ONE_TIME" ? "Also sets up a recurring cost for this property from next month." : undefined}
          >
            <ChipGroup ariaLabel="Frequency" value={frequency} onChange={setFrequency} options={FREQUENCY_OPTIONS} />
          </Field>
        )}

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Receipt</span>
          {receiptUrl && safeReceipt ? (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeReceipt} alt="Receipt" className="size-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </span>
              )}
              <a
                href={safeReceipt}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-brand-azure"
              >
                {receiptName ?? "View receipt"}
              </a>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setReceiptUrl(null);
                    setReceiptName(null);
                  }}
                  className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                  aria-label="Remove receipt"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <UploadButton
                icon={uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                label={uploading ? "Uploading…" : "Take photo"}
                accept="image/*"
                capture
                disabled={uploading || readOnly}
                onFile={uploadReceipt}
              />
              <UploadButton
                icon={<Paperclip className="size-4" />}
                label="Attach file"
                accept="image/*,application/pdf"
                disabled={uploading || readOnly}
                onFile={uploadReceipt}
              />
            </div>
          )}
        </div>

        <Field label="Note">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Plumber fixed the bathroom tap"
            rows={2}
            maxLength={300}
            className="text-base lg:text-sm"
          />
        </Field>

        {category?.isRefundableDeposit && (
          <Notice>
            Refundable deposits count as capital tied up, not an expense - they won&apos;t reduce net
            operating income.
          </Notice>
        )}
        {category?.group === "INITIAL_INVESTMENT" && (
          <Notice>Setup costs are recorded as investment and feed capital recovery, not the monthly P&amp;L.</Notice>
        )}
      </fieldset>

      <FormError>{error}</FormError>
    </form>
  );
}

function UploadButton({
  icon,
  label,
  accept,
  capture,
  disabled,
  onFile,
}: {
  icon: React.ReactNode;
  label: string;
  accept: string;
  capture?: boolean;
  disabled?: boolean;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label
      className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card text-sm font-medium text-foreground transition-colors hover:border-brand-mist ${
        disabled ? "pointer-events-none opacity-50" : ""
      }`}
    >
      {icon}
      {label}
      <input
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-chart-3/8 p-3 text-xs leading-relaxed text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0 text-chart-3" />
      <span>{children}</span>
    </p>
  );
}
