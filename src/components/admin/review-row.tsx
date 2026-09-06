"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  MessageSquareReply,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  REVIEW_SOURCE_LABELS,
  TRIP_TYPE_LABELS,
  formatReviewMonth,
  formatStayLength,
} from "@/lib/property/reviews";
import type { ReviewSource, ReviewStatus, TripType } from "@prisma/client";

export type AdminReview = {
  id: string;
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  author: string;
  /** Written by a guest of ours against a real booking. */
  isGuestReview: boolean;
  bookingCode: string | null;
  rating: number;
  title: string | null;
  body: string;
  nights: number | null;
  stayedOn: string;
  tripType: TripType | null;
  source: ReviewSource;
  status: ReviewStatus;
  isFeatured: boolean;
  response: string | null;
  topics: { code: string; label: string; emoji: string; inferred: boolean }[];
};

const STATUS_STYLES: Record<ReviewStatus, string> = {
  PUBLISHED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  PENDING: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  HIDDEN: "border-border bg-muted text-muted-foreground",
};

/**
 * One review in the moderation list. Publishing, hiding, featuring and
 * replying all hit the same PATCH endpoint; deleting is only offered for
 * imported reviews, since a guest's own review should be hideable but never
 * quietly removable.
 */
export function ReviewRow({ review }: { review: AdminReview }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [response, setResponse] = useState(review.response ?? "");

  async function patch(body: Record<string, unknown>, message: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update the review.");
      toast.success(message);
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update the review.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reviews?id=${review.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete the review.");
      toast.success("Review deleted");
      startTransition(() => router.refresh());
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the review.",
      );
    } finally {
      setBusy(false);
    }
  }

  const working = busy || pending;

  return (
    <li className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-foreground">
            {review.author}
            {review.isGuestReview && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-brand-mist">
                <BadgeCheck className="size-3.5" />
                Verified stay
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Link
              href={`/admin/properties/${review.propertyId}`}
              className="hover:text-brand-azure"
            >
              {review.propertyName}
            </Link>{" "}
            · {formatReviewMonth(review.stayedOn)}
            {review.nights ? ` · ${formatStayLength(review.nights)}` : ""}
            {review.tripType ? ` · ${TRIP_TYPE_LABELS[review.tripType]}` : ""}
            {review.bookingCode ? ` · ${review.bookingCode}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex items-center gap-1 text-sm font-medium text-foreground"
            aria-label={`${review.rating} out of 5`}
          >
            <Star className="size-3.5 fill-brand-gold text-brand-gold" />
            {review.rating}
          </span>
          <Badge className="border-border bg-muted text-muted-foreground">
            {REVIEW_SOURCE_LABELS[review.source]}
          </Badge>
          <Badge className={STATUS_STYLES[review.status]}>
            {review.status.toLowerCase()}
          </Badge>
          {review.isFeatured && (
            <Badge className="border-chart-3/25 bg-chart-3/10 text-chart-3">
              featured
            </Badge>
          )}
        </div>
      </div>

      {review.title && (
        <p className="mt-3 text-sm font-medium text-foreground">
          {review.title}
        </p>
      )}
      <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
        {review.body}
      </p>

      {review.topics.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {review.topics.map((topic) => (
            <li
              key={topic.code}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
              // Inferred chips are the fallback, so they are marked as such -
              // otherwise there is no way to tell what an admin actually set.
              title={topic.inferred ? "Inferred from the review text" : "Tagged"}
            >
              <span aria-hidden>{topic.emoji}</span>
              {topic.label}
              {topic.inferred && <span className="opacity-60">·auto</span>}
            </li>
          ))}
        </ul>
      )}

      {review.response && !replying && (
        <div className="mt-3 border-l-2 border-border pl-3">
          <p className="text-xs font-medium text-foreground">
            Your reply
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
            {review.response}
          </p>
        </div>
      )}

      {replying && (
        <div className="mt-3">
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Reply publicly - it appears under the review on the listing."
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              disabled={working}
              onClick={async () => {
                await patch({ response: response || null }, "Reply saved");
                setReplying(false);
              }}
            >
              {working && <Loader2 className="animate-spin" />}
              Save reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setResponse(review.response ?? "");
                setReplying(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {review.status === "PUBLISHED" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={working}
            onClick={() => patch({ status: "HIDDEN" }, "Review hidden")}
          >
            <EyeOff />
            Hide
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={working}
            onClick={() => patch({ status: "PUBLISHED" }, "Review published")}
          >
            <Eye />
            Publish
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          disabled={working}
          onClick={() =>
            patch(
              { isFeatured: !review.isFeatured },
              review.isFeatured ? "Unpinned" : "Pinned to the top",
            )
          }
        >
          <Star />
          {review.isFeatured ? "Unpin" : "Pin"}
        </Button>

        {!replying && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReplying(true)}
          >
            <MessageSquareReply />
            {review.response ? "Edit reply" : "Reply"}
          </Button>
        )}

        {!review.isGuestReview && (
          <Button
            size="sm"
            variant="destructive"
            disabled={working}
            onClick={remove}
          >
            <Trash2 />
            Delete
          </Button>
        )}
      </div>
    </li>
  );
}
