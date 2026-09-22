"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OAUTH_ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up yet. Use a one-time code instead.",
  google_state_mismatch: "That Google sign-in took too long or didn't come from this site. Please try again.",
  google_failed: "Google sign-in didn't go through. Please try again or use a one-time code.",
};

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"identifier" | "code">("identifier");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    () => OAUTH_ERRORS[searchParams.get("error") ?? ""] ?? null,
  );

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not send a code. Please try again.");
      setDevCode(data.devCode ?? null);
      setStep("code");
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
        body: JSON.stringify({ identifier, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Could not verify that code. Please try again.");
      router.push(data.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify that code.");
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {step === "identifier" ? (
        <div className="space-y-4">
          <Button
            render={<Link href="/api/auth/google" />}
            variant="outline"
            size="lg"
            className="w-full"
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={requestCode} className="space-y-4">
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Email or mobile
              </Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {error && <ErrorText>{error}</ErrorText>}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Send me a code
            </Button>
          </form>
        </div>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep("identifier");
              setCode("");
              setError(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Change {identifier.includes("@") ? "email" : "number"}
          </button>

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
              className="text-center font-mono text-lg tracking-[0.4em]"
              required
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Sent to {identifier}
            </p>
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

          {error && <ErrorText>{error}</ErrorText>}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || code.length !== 6}
          >
            {loading && <Loader2 className="animate-spin" />}
            Verify and continue
          </Button>
        </form>
      )}
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.89c2.27-2.09 3.58-5.17 3.58-8.84z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.89-3.02c-1.08.72-2.46 1.15-4.04 1.15-3.11 0-5.74-2.1-6.68-4.92H1.3v3.09C3.27 21.3 7.3 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.32 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.39-2.31V6.6H1.3A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.3 5.4z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.45-3.45C17.94 1.19 15.24 0 12 0 7.3 0 3.27 2.7 1.3 6.6l4.02 3.09c.94-2.82 3.57-4.92 6.68-4.92z"
      />
    </svg>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
