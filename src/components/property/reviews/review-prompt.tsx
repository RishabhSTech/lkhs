"use client";

import { useEffect, useState } from "react";
import {
  WriteReview,
  type ReviewableStay,
} from "@/components/property/reviews/write-review";

/**
 * "Write a review", resolved after hydration instead of during the render.
 *
 * The listing page is otherwise identical for every visitor, so this one
 * signed-in-only affordance was the only reason it read cookies - and a single
 * cookie read forces the whole route to be rendered per request. Asking for it
 * separately lets the page ship as prerendered HTML and lets the button appear
 * a moment later for the small share of visitors who can use it.
 *
 * Renders nothing at all unless there is a stay to review, which is also what
 * a signed-out visitor gets.
 */
export function ReviewPrompt({
  propertyId,
  variant,
  className,
}: {
  propertyId: string;
  variant?: "default" | "outline";
  className?: string;
}) {
  const [stay, setStay] = useState<ReviewableStay | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/reviews?propertyId=${encodeURIComponent(propertyId)}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStay(data?.stay ?? null))
      // A signed-out visitor is the common case, not an error worth surfacing.
      .catch(() => {});

    return () => controller.abort();
  }, [propertyId]);

  if (!stay) return null;

  return <WriteReview stay={stay} variant={variant} className={className} />;
}
