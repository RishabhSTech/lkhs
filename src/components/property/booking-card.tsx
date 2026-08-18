"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/property/date-range-picker";
import { formatINR } from "@/lib/format";
import type { Quote } from "@/lib/pricing/engine";
import { cn } from "@/lib/utils";

export function BookingCard({
  propertyId,
  propertySlug,
  basePrice,
  maxGuests,
  className,
}: {
  propertyId: string;
  propertySlug: string;
  basePrice: number;
  maxGuests: number;
  className?: string;
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setQuote(null);
      setAvailable(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, checkIn, checkOut }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not price those dates.");
        setQuote(data.quote);
        setAvailable(data.available);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setQuote(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [propertyId, checkIn, checkOut]);

  function reserve() {
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      guests: String(guests),
    });
    router.push(`/checkout/${propertySlug}?${params.toString()}`);
  }

  const canReserve = Boolean(quote && available && !loading);

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      <div className="flex items-baseline gap-1.5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={quote?.averageNightlyRate ?? basePrice}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
            className="text-[1.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-foreground"
          >
            {formatINR(quote?.averageNightlyRate ?? basePrice)}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm text-muted-foreground">/ night</span>
      </div>

      <div className="mt-4 space-y-2">
        <DateRangePicker
          propertySlug={propertySlug}
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(next) => {
            setCheckIn(next.checkIn);
            setCheckOut(next.checkOut);
          }}
        />

        <label className="flex items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2.5">
          <Users className="size-4 shrink-0 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Guests</span>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="ml-auto cursor-pointer bg-transparent text-sm font-medium text-foreground outline-none"
          >
            {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <Alert>{error}</Alert>}

      {available === false && !loading && (
        <Alert>Those dates are already booked. Try shifting by a day or two.</Alert>
      )}

      <AnimatePresence initial={false}>
        {quote && (
          <motion.dl
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 space-y-2 overflow-hidden text-sm"
          >
            <Row
              label={`${formatINR(quote.averageNightlyRate)} × ${quote.nightCount} ${
                quote.nightCount === 1 ? "night" : "nights"
              }`}
              value={formatINR(quote.subtotal)}
            />
            {quote.discount > 0 && (
              <Row
                label="Long-stay discount"
                value={`− ${formatINR(quote.discount)}`}
                accent
              />
            )}
            <Row label="Cleaning fee" value={formatINR(quote.cleaningFee)} />
            <Row label="Taxes (GST 12%)" value={formatINR(quote.taxes)} />
            <div className="flex items-baseline justify-between border-t border-border pt-3 text-base">
              <dt className="font-medium text-foreground">Total</dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">
                {formatINR(quote.total)}
              </dd>
            </div>
          </motion.dl>
        )}
      </AnimatePresence>

      <Button
        size="lg"
        className="mt-4 w-full"
        disabled={!canReserve}
        onClick={reserve}
      >
        {loading && <Loader2 className="animate-spin" />}
        {!checkIn || !checkOut ? "Select your dates" : "Reserve this stay"}
      </Button>

      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        You won&apos;t be charged yet. No account needed to book.
      </p>
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/8 p-2.5 text-xs text-destructive"
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  );
}

function Row({
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
