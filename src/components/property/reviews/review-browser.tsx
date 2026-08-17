"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ReviewCard } from "@/components/property/reviews/review-card";
import { ReviewTopics } from "@/components/property/reviews/review-topics";
import type { PublicReview } from "@/lib/property/review-display";
import type { ReviewTopicCount } from "@/lib/property/review-topics";

/** How many reviews sit on the page before the dialog takes over. */
const PREVIEW_COUNT = 6;

/**
 * The interactive half of the reviews section: the topic chips, the preview
 * grid they filter, and the "Show all" dialog.
 *
 * The rating breakdown is rendered on the server and handed in as `summary`,
 * so the only things that ship to the browser are the filter state and the
 * review bodies — not the whole icon set the breakdown needs.
 */
export function ReviewBrowser({
  reviews,
  topics,
  summary,
  action,
}: {
  reviews: PublicReview[];
  topics: ReviewTopicCount[];
  summary: React.ReactNode;
  /** "Write a review", when the viewer has a stay to review. */
  action?: React.ReactNode;
}) {
  const [topic, setTopic] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byTopic = useMemo(
    () =>
      topic ? reviews.filter((review) => review.topics.includes(topic)) : reviews,
    [reviews, topic],
  );

  const searched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return byTopic;
    return byTopic.filter(
      (review) =>
        review.body.toLowerCase().includes(needle) ||
        review.title?.toLowerCase().includes(needle) ||
        review.name.toLowerCase().includes(needle),
    );
  }, [byTopic, query]);

  const label = topics.find((t) => t.code === topic)?.label;

  return (
    <div>
      {topics.length > 0 && (
        <div className="mt-8">
          <ReviewTopics topics={topics} selected={topic} onSelect={setTopic} />
        </div>
      )}

      {topic && (
        <p className="mt-5 text-sm text-muted-foreground">
          Showing {byTopic.length} {byTopic.length === 1 ? "review" : "reviews"}{" "}
          mentioning {label?.toLowerCase()}.{" "}
          <button
            type="button"
            onClick={() => setTopic(null)}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Show all
          </button>
        </p>
      )}

      <div className="mt-8 grid gap-x-12 gap-y-9 sm:grid-cols-2">
        {byTopic.slice(0, PREVIEW_COUNT).map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {byTopic.length > PREVIEW_COUNT && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="lg">
                  Show all {byTopic.length} reviews
                </Button>
              }
            />
            <DialogContent className="max-h-[88svh] max-w-3xl gap-0 overflow-y-auto p-0 sm:max-w-3xl">
              <DialogHeader className="sticky top-0 z-10 border-b border-border bg-popover px-6 pt-6 pb-4">
                <DialogTitle className="font-heading text-xl">
                  {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                </DialogTitle>
              </DialogHeader>

              <div className="px-6 py-6">
                {summary}

                {topics.length > 0 && (
                  <div className="mt-8">
                    <ReviewTopics
                      topics={topics}
                      selected={topic}
                      onSelect={setTopic}
                    />
                  </div>
                )}

                <div className="relative mt-6">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search reviews"
                    aria-label="Search reviews"
                    className="pl-9"
                  />
                </div>

                {searched.length === 0 ? (
                  <p className="mt-8 text-sm text-muted-foreground">
                    No reviews match that.
                  </p>
                ) : (
                  <div className="mt-8 grid gap-x-12 gap-y-9 sm:grid-cols-2">
                    {searched.map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        expandable={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {action}
      </div>
    </div>
  );
}
