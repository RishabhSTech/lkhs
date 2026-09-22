"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Shown on the confirmation page when the guest booked without an active
 * session. Verifying the same email/phone they already gave at checkout
 * (via the same OTP endpoints as /signin) turns that anonymous Guest row
 * into a real account - findOrCreateUser also claims any other bookings
 * made under this identifier, so past trips show up too.
 */
export function ClaimTripForm({ identifier, name }: { identifier: string; name: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  async function sendCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Could not send a code. Please try again.");
      setDevCode(data.devCode ?? null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setLoading(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code, name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Could not verify that code. Please try again.");
      setClaimed(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify that code.");
    } finally {
      setLoading(false);
    }
  }

  if (claimed) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-6">
        <CheckCircle2 className="size-5 shrink-0 text-brand-mist" />
        <p className="text-sm text-foreground">
          Trip saved. You can manage it anytime from{" "}
          <span className="font-medium">My account</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-mist" />
        <div>
          <h2 className="font-heading text-lg text-foreground">
            Save this trip to an account
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            No password needed - verify {identifier} with a one-time code and
            we&apos;ll create your free Lime Kraft account, with this trip (and
            any past bookings under this email) already in it.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {!sent ? (
          <Button size="lg" onClick={sendCode} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Send me a code
          </Button>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                6-digit code
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="max-w-40 text-center font-mono text-lg tracking-[0.4em]"
                required
              />
            </div>

            {devCode && (
              <p className="rounded-lg bg-chart-4/10 p-3 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Demo mode:</span> no
                email or SMS provider is connected, so here is your code -{" "}
                <span className="font-mono font-semibold text-foreground">
                  {devCode}
                </span>
              </p>
            )}

            <Button type="submit" size="lg" disabled={loading || code.length !== 6}>
              {loading && <Loader2 className="animate-spin" />}
              Verify and save trip
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
