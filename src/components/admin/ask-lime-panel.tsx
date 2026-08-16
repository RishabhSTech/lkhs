"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

type Answer = {
  answer: string;
  detail?: { label: string; value: string }[];
  proposedAction?: { summary: string; requiresConfirmation: true };
  matched: boolean;
};

const SUGGESTIONS = [
  "Which property is most profitable?",
  "How much did we spend on cleaning last month?",
  "Which bookings arrive tomorrow?",
  "Which properties are over budget?",
  "Recommend a price increase for next weekend.",
];

export function AskLimePanel() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function ask(q: string) {
    if (q.trim().length < 2) return;
    setLoading(true);
    setAnswer(null);
    setConfirmed(false);
    try {
      const res = await fetch("/api/admin/ask-lime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      setAnswer(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            <Sparkles />
            <span className="hidden sm:inline">Ask Lime</span>
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-heading text-xl text-brand-green">
            <Sparkles className="size-4 text-brand-terracotta" />
            Ask Lime
          </SheetTitle>
          <SheetDescription>
            Questions about your portfolio, answered from live data.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
            className="flex gap-2"
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about revenue, expenses, ROI…"
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : <Send />}
              <span className="sr-only">Ask</span>
            </Button>
          </form>

          {answer && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm leading-relaxed text-foreground">
                {answer.answer}
              </p>

              {answer.detail && answer.detail.length > 0 && (
                <dl className="mt-3 space-y-1.5 border-t border-border pt-3">
                  {answer.detail.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <dt className="truncate text-muted-foreground">
                        {row.label}
                      </dt>
                      <dd className="shrink-0 font-medium tabular-nums text-foreground">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {answer.proposedAction && (
                <div className="mt-4 rounded-lg border border-chart-4/40 bg-chart-4/8 p-3">
                  <p className="flex items-start gap-2 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-4" />
                    <span>
                      <span className="font-medium">Proposed change</span>
                      <span className="mt-0.5 block text-muted-foreground">
                        {answer.proposedAction.summary}
                      </span>
                    </span>
                  </p>
                  {confirmed ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Confirmed. Applying pricing changes is not wired up in this
                      demo — the proposal is shown but never executed silently.
                    </p>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => setConfirmed(true)}>
                        Review and apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAnswer({ ...answer, proposedAction: undefined })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Try asking
            </p>
            <ul className="mt-2 space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuestion(s);
                      ask(s);
                    }}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-brand-sage hover:text-foreground"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            Ask Lime computes answers directly from your database — it is not a
            language model and never invents figures. Anything that would change
            data is proposed for your confirmation first.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
