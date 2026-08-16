"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, Building2, Check, CreditCard, Loader2, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/property/date-range-picker";
import { Label } from "@/components/ui/label";
import { formatDateRange, formatINR } from "@/lib/format";
import type { Quote } from "@/lib/pricing/engine";
import { cn } from "@/lib/utils";

type PropertySummary = {
  id: string;
  slug: string;
  name: string;
  locationArea: string;
  city: string;
  heroImage: string;
  maxGuests: number;
  basePrice: number;
};

const STEPS = ["Dates & guests", "Your details", "Payment"] as const;

const PAYMENT_METHODS = [
  { value: "UPI", label: "UPI", hint: "GPay, PhonePe, Paytm", icon: Smartphone },
  { value: "CARD", label: "Card", hint: "Credit or debit", icon: CreditCard },
  { value: "NETBANKING", label: "Net banking", hint: "All major banks", icon: Building2 },
] as const;

export function CheckoutFlow({
  property,
  initial,
}: {
  property: PropertySummary;
  initial: { checkIn: string; checkOut: string; guests: number };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [guests, setGuests] = useState(initial.guests);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHODS)[number]["value"]>("UPI");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setQuote(null);
      setAvailable(null);
      return;
    }
    const controller = new AbortController();
    setQuoting(true);
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: property.id, checkIn, checkOut }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setQuote(data.quote);
        setAvailable(data.available);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setQuoting(false));
    return () => controller.abort();
  }, [property.id, checkIn, checkOut]);

  const datesValid = Boolean(quote && available);
  const detailsValid = name.trim().length >= 2 && (email.trim() || phone.trim());

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertySlug: property.slug,
          checkIn,
          checkOut,
          guests,
          name,
          email,
          phone,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed.");
      router.push(`/booking-confirmation/${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <button
        type="button"
        onClick={() => (step === 0 ? router.back() : setStep((s) => s - 1))}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {step === 0 ? "Back to stay" : `Back to ${STEPS[step - 1]}`}
      </button>

      <h1 className="mt-5 font-heading text-3xl leading-tight text-foreground sm:text-4xl">
        Complete your booking
      </h1>

      <ol className="mt-6 flex items-center gap-2" aria-label="Booking progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-brand-terracotta text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-medium sm:block",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <StepCard title="When are you staying?">
                  <Field label="Dates">
                    <DateRangePicker
                      propertySlug={property.slug}
                      checkIn={checkIn}
                      checkOut={checkOut}
                      onChange={(next) => {
                        setCheckIn(next.checkIn);
                        setCheckOut(next.checkOut);
                      }}
                    />
                  </Field>
                  <Field label="Guests" className="mt-4 max-w-[12rem]">
                    <Input
                      type="number"
                      min={1}
                      max={property.maxGuests}
                      value={guests}
                      onChange={(e) =>
                        setGuests(
                          Math.min(
                            property.maxGuests,
                            Math.max(1, Number(e.target.value)),
                          ),
                        )
                      }
                    />
                  </Field>

                  {available === false && (
                    <Alert>
                      Those dates are already booked. Try shifting by a day or two.
                    </Alert>
                  )}

                  <Button
                    size="lg"
                    className="mt-6"
                    disabled={!datesValid || quoting}
                    onClick={() => setStep(1)}
                  >
                    {quoting && <Loader2 className="animate-spin" />}
                    Continue
                  </Button>
                </StepCard>
              )}

              {step === 1 && (
                <StepCard
                  title="Who's staying?"
                  description="No password needed — we'll create your Lime Kraft account automatically after booking."
                >
                  <div className="grid gap-4">
                    <Field label="Full name" required>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ananya Sharma"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </Field>
                    <Field label="Mobile">
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98200 00000"
                        autoComplete="tel"
                      />
                    </Field>
                    <p className="text-xs text-muted-foreground">
                      Give us at least one of email or mobile so we can send your
                      confirmation and check-in details.
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="mt-6"
                    disabled={!detailsValid}
                    onClick={() => setStep(2)}
                  >
                    Continue to payment
                  </Button>
                </StepCard>
              )}

              {step === 2 && (
                <StepCard title="How would you like to pay?">
                  <div className="grid gap-3">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                          paymentMethod === method.value
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-ring",
                        )}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={method.value}
                          checked={paymentMethod === method.value}
                          onChange={() => setPaymentMethod(method.value)}
                          className="sr-only"
                        />
                        <method.icon className="size-5 text-brand-sage" />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-foreground">
                            {method.label}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {method.hint}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "grid size-4 place-items-center rounded-full border-2 transition-colors",
                            paymentMethod === method.value
                              ? "border-primary"
                              : "border-border",
                          )}
                        >
                          {paymentMethod === method.value && (
                            <span className="size-2 rounded-full bg-primary" />
                          )}
                        </span>
                      </label>
                    ))}
                  </div>

                  <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                    Demo environment — no payment gateway is connected, so no money
                    moves. The booking is created for real and appears in the Lime
                    Kraft dashboard.
                  </p>

                  {error && <Alert>{error}</Alert>}

                  <Button
                    size="lg"
                    className="mt-6 w-full sm:w-auto"
                    disabled={submitting || !datesValid}
                    onClick={submit}
                  >
                    {submitting && <Loader2 className="animate-spin" />}
                    {quote
                      ? `Pay ${formatINR(quote.total)} and confirm`
                      : "Confirm booking"}
                  </Button>
                </StepCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {property.heroImage && (
              <div className="relative aspect-[16/10]">
                <Image
                  src={property.heroImage}
                  alt={property.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 20rem"
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-5">
              <h2 className="font-heading text-xl leading-snug text-foreground">
                {property.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {property.locationArea}, {property.city}
              </p>

              {checkIn && checkOut && checkOut > checkIn && (
                <p className="mt-4 border-t border-border pt-4 text-sm text-foreground">
                  {formatDateRange(checkIn, checkOut)}
                  <span className="block text-muted-foreground">
                    {guests} {guests === 1 ? "guest" : "guests"}
                  </span>
                </p>
              )}

              {quote && (
                <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                  <SummaryRow
                    label={`${formatINR(quote.averageNightlyRate)} × ${quote.nightCount} nights`}
                    value={formatINR(quote.subtotal)}
                  />
                  {quote.discount > 0 && (
                    <SummaryRow
                      label="Discount"
                      value={`− ${formatINR(quote.discount)}`}
                      accent
                    />
                  )}
                  <SummaryRow label="Cleaning fee" value={formatINR(quote.cleaningFee)} />
                  <SummaryRow label="Taxes" value={formatINR(quote.taxes)} />
                  <div className="flex items-baseline justify-between border-t border-border pt-3">
                    <dt className="font-medium text-foreground">Total</dt>
                    <dd className="font-heading text-xl text-foreground">
                      {formatINR(quote.total)}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-heading text-2xl text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {required && <span className="text-brand-terracotta"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={accent ? "text-brand-terracotta" : "text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
