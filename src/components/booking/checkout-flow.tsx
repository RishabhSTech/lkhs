"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react";
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

const STEPS = ["Dates & guests", "Your details"] as const;

export function CheckoutFlow({
  property,
  initial,
}: {
  property: PropertySummary;
  initial: {
    checkIn: string;
    checkOut: string;
    guests: number;
    quote?: Quote | null;
    available?: boolean | null;
    blockedDates?: string[];
  };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [guests, setGuests] = useState(initial.guests);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [quote, setQuote] = useState<Quote | null>(initial.quote ?? null);
  const [available, setAvailable] = useState<boolean | null>(
    initial.available ?? null,
  );
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The server already priced `initial.checkIn`/`initial.checkOut` before
  // this ever hit the client - skip re-fetching the identical quote on
  // mount, and only hit /api/quote once the guest actually changes a date.
  const skipNextQuote = useRef(
    Boolean(initial.quote) &&
      initial.checkIn === checkIn &&
      initial.checkOut === checkOut,
  );

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setQuote(null);
      setAvailable(null);
      return;
    }
    if (skipNextQuote.current) {
      skipNextQuote.current = false;
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
  const detailsValid = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email.trim());

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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ??
            "We couldn't send that booking request. Try again, or message us and we'll hold the dates.",
        );
      }

      router.push(`/booking-confirmation/${data.code}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't send that booking request. Try again, or message us and we'll hold the dates.",
      );
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
        Request your booking
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
                    ? "bg-brand-azure text-white"
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
                      initialBlocked={initial.blockedDates}
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
                  description="No account needed to book. Once you're done, you can save this trip with a one-time code - no password."
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
                    <Field label="Email" required>
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
                      We&apos;ll send your confirmation and check-in details to this
                      email address.
                    </p>
                  </div>

                  <p className="mt-4 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                    We don&apos;t take payment online yet - send your request and
                    our team will reach out to confirm your stay and share
                    payment details. Nothing is charged now.
                  </p>

                  {error && <Alert>{error}</Alert>}

                  <Button
                    size="lg"
                    className="mt-6 w-full sm:w-auto"
                    disabled={submitting || !detailsValid || !datesValid}
                    onClick={submit}
                  >
                    {submitting && <Loader2 className="animate-spin" />}
                    Send booking request
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
        {required && <span className="text-brand-azure"> *</span>}
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
      <dd className={accent ? "text-brand-azure" : "text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
