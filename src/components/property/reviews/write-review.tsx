"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "@/components/property/reviews/star-input";
import {
  MAX_TOPICS,
  TopicPicker,
} from "@/components/property/reviews/topic-picker";
import {
  REVIEW_CATEGORIES,
  TRIP_TYPE_LABELS,
  formatReviewMonth,
  formatStayLength,
  type ReviewCategoryKey,
} from "@/lib/property/reviews";

/** A completed stay that has not been reviewed yet. */
export type ReviewableStay = {
  reservationId: string;
  code: string;
  propertyName: string;
  /** ISO string - only the month is rendered. */
  checkOut: string;
  /** Derived from the booking, never typed in by the guest. */
  nights: number;
};

const MIN_BODY = 30;

export function WriteReview({
  stay,
  variant = "default",
  className,
}: {
  stay: ReviewableStay;
  variant?: "default" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [categories, setCategories] = useState<
    Partial<Record<ReviewCategoryKey, number>>
  >({});
  const [tripType, setTripType] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!rating) return setError("Give the stay an overall rating.");
    if (body.trim().length < MIN_BODY) {
      return setError(
        `Tell future guests a little more - at least ${MIN_BODY} characters.`,
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: stay.reservationId,
          rating,
          ...categories,
          tripType: tripType || undefined,
          topics,
          title: title.trim() || undefined,
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post your review.");

      toast.success("Thanks for the review", {
        description: "It's live on the listing now.",
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not post your review.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant} className={className}>
            <PenLine />
            Write a review
          </Button>
        }
      />
      <DialogContent className="max-h-[88svh] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 pt-6 pb-4">
          <DialogTitle className="font-heading text-xl">
            How was {stay.propertyName}?
          </DialogTitle>
          {/* Stay length comes from the booking, so it is stated rather than
              asked - it is the part of the review guests trust most. */}
          <p className="mt-1 text-sm text-muted-foreground">
            {formatStayLength(stay.nights)} ·{" "}
            {formatReviewMonth(stay.checkOut)} · booking {stay.code}
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6 px-6 py-6">
          <div className="rounded-xl border border-border p-4">
            <StarInput
              label="Overall rating"
              name="rating"
              value={rating}
              onChange={setRating}
              required
            />
          </div>

          <div className="space-y-4">
            <p className="label-eyebrow">Rate the details</p>
            {REVIEW_CATEGORIES.map((category) => (
              <StarInput
                key={category.key}
                label={category.label}
                name={category.key}
                value={categories[category.key] ?? null}
                onChange={(value) =>
                  setCategories((prev) => ({ ...prev, [category.key]: value }))
                }
              />
            ))}
          </div>

          <div>
            <Label
              htmlFor="trip-type"
              className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              What kind of trip was it?
            </Label>
            <select
              id="trip-type"
              value={tripType}
              onChange={(e) => setTripType(e.target.value)}
              className={selectClass}
            >
              <option value="">Prefer not to say</option>
              {Object.entries(TRIP_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              What stood out? (up to {MAX_TOPICS})
            </Label>
            <TopicPicker value={topics} onChange={setTopics} />
          </div>

          <div>
            <Label
              htmlFor="review-title"
              className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Headline
            </Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Sum it up in a few words"
            />
          </div>

          <div>
            <Label
              htmlFor="review-body"
              className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
            >
              Your review <span className="text-brand-azure">*</span>
            </Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="What would you want to know before booking this place?"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {body.trim().length < MIN_BODY
                ? `${MIN_BODY - body.trim().length} more characters`
                : `${body.length}/2000`}
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Post review
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
