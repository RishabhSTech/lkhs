"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, Plus } from "lucide-react";
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
  REVIEW_SOURCE_LABELS,
  TRIP_TYPE_LABELS,
  type ReviewCategoryKey,
} from "@/lib/property/reviews";

const selectClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Adding a review by hand — almost always one carried over from an OTA. These
 * never claim to be a verified stay, so the stay length is typed in rather
 * than derived, and the author's name has to be supplied.
 */
export function ReviewImportForm({
  properties,
}: {
  properties: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [rating, setRating] = useState<number | null>(5);
  const [categories, setCategories] = useState<
    Partial<Record<ReviewCategoryKey, number>>
  >({});
  const [authorName, setAuthorName] = useState("");
  const [authorLocation, setAuthorLocation] = useState("");
  const [authorSince, setAuthorSince] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [nightsStayed, setNightsStayed] = useState("");
  const [stayedOn, setStayedOn] = useState("");
  const [tripType, setTripType] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [source, setSource] = useState("AIRBNB");
  const [status, setStatus] = useState("PUBLISHED");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!rating) return setError("Pick an overall rating.");
    if (!authorName.trim()) return setError("Who wrote the review?");
    if (body.trim().length < 10) return setError("Add the review text.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          rating,
          ...categories,
          authorName: authorName.trim(),
          authorLocation: authorLocation.trim() || null,
          authorSince: authorSince ? Number(authorSince) : null,
          title: title.trim() || null,
          body: body.trim(),
          nightsStayed: nightsStayed ? Number(nightsStayed) : null,
          stayedOn: stayedOn || null,
          tripType: tripType || null,
          topics,
          source,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the review.");

      toast.success("Review added");
      setOpen(false);
      setAuthorName("");
      setTitle("");
      setBody("");
      setCategories({});
      setTopics([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            Add review
          </Button>
        }
      />
      <DialogContent className="max-h-[88svh] max-w-lg gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-6 pt-6 pb-4">
          <DialogTitle className="font-heading text-xl">Add a review</DialogTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            For reviews collected elsewhere. Guest reviews written on the site
            arrive here automatically.
          </p>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 px-6 py-6">
          <Field label="Property" required>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className={selectClass}
              required
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-xl border border-border p-4">
            <StarInput
              label="Overall rating"
              name="admin-rating"
              value={rating}
              onChange={setRating}
              required
            />
          </div>

          <div className="space-y-3">
            <p className="label-eyebrow">Category scores (optional)</p>
            {REVIEW_CATEGORIES.map((category) => (
              <StarInput
                key={category.key}
                label={category.label}
                name={`admin-${category.key}`}
                value={categories[category.key] ?? null}
                onChange={(value) =>
                  setCategories((prev) => ({ ...prev, [category.key]: value }))
                }
              />
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reviewer name" required>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Daniel R."
                required
              />
            </Field>
            <Field label="Reviewer location">
              <Input
                value={authorLocation}
                onChange={(e) => setAuthorLocation(e.target.value)}
                placeholder="Melbourne, Australia"
              />
            </Field>
            <Field label="Guest since (year)">
              <Input
                type="number"
                min="2000"
                max="2100"
                value={authorSince}
                onChange={(e) => setAuthorSince(e.target.value)}
                placeholder="2019"
              />
            </Field>
            <Field label="Nights stayed">
              <Input
                type="number"
                min="1"
                max="365"
                value={nightsStayed}
                onChange={(e) => setNightsStayed(e.target.value)}
                placeholder="4"
              />
            </Field>
            <Field label="Month of stay">
              <Input
                type="date"
                value={stayedOn}
                onChange={(e) => setStayedOn(e.target.value)}
              />
            </Field>
            <Field label="Trip type">
              <select
                value={tripType}
                onChange={(e) => setTripType(e.target.value)}
                className={selectClass}
              >
                <option value="">Not stated</option>
                {Object.entries(TRIP_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={selectClass}
              >
                {Object.entries(REVIEW_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectClass}
              >
                <option value="PUBLISHED">Published</option>
                <option value="PENDING">Pending</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </Field>
          </div>

          <div>
            <Label className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Topics ({MAX_TOPICS} max)
            </Label>
            <TopicPicker value={topics} onChange={setTopics} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Drives the chips above the reviews. Left blank, they&rsquo;re
              inferred from the review text.
            </p>
          </div>

          <Field label="Headline">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Ideal base for a work week"
            />
          </Field>

          <Field label="Review" required>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={2000}
              required
            />
          </Field>

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
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save review
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
        {required && <span className="text-brand-azure"> *</span>}
      </Label>
      {children}
    </div>
  );
}
