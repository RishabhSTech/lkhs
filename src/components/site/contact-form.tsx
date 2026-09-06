"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send that. Please try again.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start rounded-xl border border-border bg-card p-8">
        <CheckCircle2 className="size-8 text-foreground" />
        <h2 className="mt-4 font-heading text-2xl text-foreground">
          Thanks - we&apos;ve got it.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Someone from the team will get back to you shortly. If it&apos;s urgent,
          WhatsApp is always faster.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setName("");
            setEmail("");
            setPhone("");
            setMessage("");
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-xl border border-border bg-card p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Name <span className="text-brand-azure">*</span>
          </Label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>
        <div>
          <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Email <span className="text-brand-azure">*</span>
          </Label>
          <Input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Mobile
        </Label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98200 00000"
          autoComplete="tel"
        />
      </div>

      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Message <span className="text-brand-azure">*</span>
        </Label>
        <Textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What can we help with?"
        />
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={sending}>
        {sending && <Loader2 className="animate-spin" />}
        Send message
      </Button>
    </form>
  );
}
