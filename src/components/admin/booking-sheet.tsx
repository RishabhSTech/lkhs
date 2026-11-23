"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import {
  ChipGroup, Field, FormError, FormSection, NativeSelect, Stepper, fieldControlClass, parseAmount, todayISO,
} from "@/components/admin/form-fields";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BookingProperty = { id: string; name: string; units: { id: string; name: string }[] };

export type BookingRecord = {
  id: string;
  propertyId: string;
  unitId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  adults: number;
  children: number;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  total: number;
  platformFee: number;
  hostTax: number;
  otherCharges: number;
};

const SOURCE_OPTIONS = [
  { value: "DIRECT", label: "Direct" },
  { value: "AIRBNB", label: "Airbnb" },
  { value: "BOOKING_COM", label: "Booking.com" },
  { value: "AGODA", label: "Agoda" },
  { value: "OTHER", label: "Other" },
];

const FORM_ID = "booking-sheet-form";

function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function BookingSheet({
  open,
  onOpenChange,
  session,
  properties,
  booking,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: number;
  properties: BookingProperty[];
  booking?: BookingRecord | null;
  defaults?: { propertyId?: string; checkIn?: string };
  onSaved?: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(booking);

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit booking" : "Add booking"}
      description={
        isEdit ? "Change the stay, guest, channel or money." : "Phone, walk-in, Airbnb or Booking.com - past dates are fine too."
      }
      size="lg"
      footer={
        <Button type="submit" form={FORM_ID} size="lg" className="w-full lg:h-10" disabled={saving}>
          {saving && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Save booking"}
        </Button>
      }
    >
      <BookingFields
        key={session}
        properties={properties}
        booking={booking ?? null}
        defaults={defaults}
        onSaving={setSaving}
        onSaved={(id) => {
          onOpenChange(false);
          onSaved?.(id);
        }}
      />
    </ResponsiveSheet>
  );
}

function BookingFields({
  properties,
  booking,
  defaults,
  onSaving,
  onSaved,
}: {
  properties: BookingProperty[];
  booking: BookingRecord | null;
  defaults?: { propertyId?: string; checkIn?: string };
  onSaving: (saving: boolean) => void;
  onSaved: (id: string) => void;
}) {
  const router = useRouter();
  const initialProperty =
    properties.find((p) => p.id === (booking?.propertyId ?? defaults?.propertyId)) ??
    (properties.length === 1 ? properties[0] : undefined);
  const initialCheckIn = booking?.checkIn ?? defaults?.checkIn ?? todayISO();

  const [propertyId, setPropertyId] = useState(initialProperty?.id ?? "");
  const [unitId, setUnitId] = useState(booking?.unitId ?? initialProperty?.units[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(booking?.checkOut ?? addDaysISO(initialCheckIn, 1));
  const [adults, setAdults] = useState(booking?.adults ?? 2);
  const [children, setChildren] = useState(booking?.children ?? 0);
  const [name, setName] = useState(booking?.name ?? "");
  const [phone, setPhone] = useState(booking?.phone ?? "");
  const [email, setEmail] = useState(booking?.email ?? "");
  const [source, setSource] = useState(booking?.source ?? "DIRECT");
  const [status, setStatus] = useState("CONFIRMED");
  const [amount, setAmount] = useState(booking ? String(booking.total) : "");
  const [platformFee, setPlatformFee] = useState(booking ? String(booking.platformFee || "") : "");
  const [hostTax, setHostTax] = useState(booking ? String(booking.hostTax || "") : "");
  const [otherCharges, setOtherCharges] = useState(booking ? String(booking.otherCharges || "") : "");
  const [showDeductions, setShowDeductions] = useState(
    Boolean(booking && (booking.platformFee || booking.hostTax || booking.otherCharges)),
  );
  const [notes, setNotes] = useState("");
  const [notifyTouched, setNotifyTouched] = useState(false);
  const [notifyGuestManual, setNotifyGuestManual] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const property = properties.find((p) => p.id === propertyId);
  const nights = nightsBetween(checkIn, checkOut);
  const deductionsVisible = showDeductions || source !== "DIRECT";
  const gross = parseAmount(amount) || 0;
  const deductions =
    (parseAmount(platformFee) || 0) + (parseAmount(hostTax) || 0) + (parseAmount(otherCharges) || 0);
  // Past stays are usually back-filled records; don't email those guests by default.
  const notifyGuest = notifyTouched ? notifyGuestManual : checkIn >= todayISO();
  const canNotify = !booking && status === "CONFIRMED" && email.trim().length > 0;

  const nightsLabel = useMemo(() => {
    if (nights <= 0) return "Check-out must be after check-in";
    return `${nights} night${nights === 1 ? "" : "s"}${gross > 0 ? ` · ${formatINR(gross / nights)}/night` : ""}`;
  }, [nights, gross]);

  function changeProperty(id: string) {
    setPropertyId(id);
    setUnitId(properties.find((p) => p.id === id)?.units[0]?.id ?? "");
  }

  function changeCheckIn(value: string) {
    setCheckIn(value);
    if (value && (!checkOut || checkOut <= value)) setCheckOut(addDaysISO(value, Math.max(1, nights)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!propertyId || !unitId) return setError("Pick the property.");
    if (nights <= 0) return setError("Check-out needs to be after check-in.");
    if (name.trim().length < 2) return setError("Enter the guest's name.");
    if (!(gross >= 0) || amount.trim() === "") return setError("Enter the booking amount (0 is fine for a block).");
    if (deductions > gross) return setError("Fees and taxes can't be more than the booking amount.");

    onSaving(true);
    try {
      const res = await fetch(booking ? `/api/admin/reservations/${booking.id}` : "/api/admin/reservations", {
        method: booking ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          unitId,
          checkIn,
          checkOut,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          adults,
          children,
          source,
          grossRevenue: gross,
          platformFee: parseAmount(platformFee) || 0,
          hostTax: parseAmount(hostTax) || 0,
          otherCharges: parseAmount(otherCharges) || 0,
          ...(booking
            ? {}
            : { status, internalNotes: notes, notifyGuest: canNotify && notifyGuest }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the booking.");
      const id = booking?.id ?? data.id;
      if (booking) {
        toast.success("Booking updated");
      } else {
        toast.success(`Booking ${data.code} added`, {
          action: { label: "Open", onClick: () => router.push(`/admin/reservations?id=${id}`) },
        });
      }
      router.refresh();
      onSaved(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the booking.");
    } finally {
      onSaving(false);
    }
  }

  return (
    <form id={FORM_ID} onSubmit={submit} className="space-y-6">
      <FormSection title="Where and when">
        <div className={cn("grid gap-3", property && property.units.length > 1 && "sm:grid-cols-2")}>
          <Field label="Which property?" required>
            <NativeSelect value={propertyId} onChange={(e) => changeProperty(e.target.value)}>
              <option value="">Choose property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {property && property.units.length > 1 && (
            <Field label="Which room / unit" required>
              <NativeSelect value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                {property.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Check-in" required>
            <Input type="date" value={checkIn} onChange={(e) => changeCheckIn(e.target.value)} className={fieldControlClass} />
          </Field>
          <Field label="Check-out" required>
            <Input
              type="date"
              value={checkOut}
              min={checkIn ? addDaysISO(checkIn, 1) : undefined}
              onChange={(e) => setCheckOut(e.target.value)}
              className={fieldControlClass}
            />
          </Field>
        </div>
        <p className={cn("text-xs", nights > 0 ? "text-muted-foreground" : "text-destructive")}>{nightsLabel}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Stepper label="Adults" value={adults} onChange={setAdults} min={1} />
          <Stepper label="Children" value={children} onChange={setChildren} />
        </div>
      </FormSection>

      <FormSection title="Guest details">
        <Field label="Guest name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={fieldControlClass} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone">
            <Input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91"
              className={fieldControlClass}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldControlClass}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Payment">
        <Field label="Where did this booking come from?">
          <ChipGroup ariaLabel="Booking source" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
        </Field>
        {!booking && (
          <Field label="Has the guest paid?">
            <ChipGroup
              ariaLabel="Booking status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "CONFIRMED", label: "Yes, confirmed" },
                { value: "PENDING", label: "Not yet" },
              ]}
            />
          </Field>
        )}
        <Field label="Total amount the guest pays (₹)" required>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="25,000"
            className={cn(fieldControlClass, "text-lg font-semibold tabular-nums")}
          />
        </Field>

        {deductionsVisible ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Money the booking site or tax takes out. Leave at 0 if none.</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Site fee">
                <Input inputMode="decimal" value={platformFee} onChange={(e) => setPlatformFee(e.target.value)} placeholder="0" className={fieldControlClass} />
              </Field>
              <Field label="Tax">
                <Input inputMode="decimal" value={hostTax} onChange={(e) => setHostTax(e.target.value)} placeholder="0" className={fieldControlClass} />
              </Field>
              <Field label="Other">
                <Input inputMode="decimal" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value)} placeholder="0" className={fieldControlClass} />
              </Field>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">We get</span>
              <span className="font-semibold tabular-nums text-foreground">{formatINR(Math.max(0, gross - deductions))}</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeductions(true)}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <ChevronDown className="size-4" />
            Booking site took a fee?
          </button>
        )}
      </FormSection>

      {!booking && (
        <FormSection title="Anything else?">
          <Field label="Note for the team" hint="Guests never see this.">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Early check-in, paid advance in cash, etc."
              className="text-base lg:text-sm"
            />
          </Field>
          {canNotify && (
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3">
              <span>
                <span className="block text-sm font-medium text-foreground">Email confirmation to guest</span>
                <span className="block text-xs text-muted-foreground">Includes the digital check-in link.</span>
              </span>
              <Switch
                checked={notifyGuest}
                onCheckedChange={(v) => {
                  setNotifyTouched(true);
                  setNotifyGuestManual(Boolean(v));
                }}
              />
            </label>
          )}
        </FormSection>
      )}

      <FormError>{error}</FormError>
    </form>
  );
}
