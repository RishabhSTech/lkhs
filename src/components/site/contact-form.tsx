"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));
    setSending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start rounded-xl border border-border bg-white p-8">
        <CheckCircle2 className="size-8 text-brand-green" />
        <h2 className="mt-4 font-heading text-2xl text-brand-green">
          Thanks — we've got it.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Someone from the team will get back to you shortly. If it's urgent,
          WhatsApp is always faster.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5 rounded-xl border border-border bg-white p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Name <span className="text-brand-terracotta">*</span>
          </Label>
          <Input required placeholder="Your name" autoComplete="name" />
        </div>
        <div>
          <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Email <span className="text-brand-terracotta">*</span>
          </Label>
          <Input
            required
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Mobile
        </Label>
        <Input type="tel" placeholder="+91 98200 00000" autoComplete="tel" />
      </div>

      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Message <span className="text-brand-terracotta">*</span>
        </Label>
        <Textarea
          required
          rows={5}
          placeholder="What can we help with?"
        />
      </div>

      <Button type="submit" size="lg" disabled={sending}>
        {sending && <Loader2 className="animate-spin" />}
        Send message
      </Button>
    </form>
  );
}
