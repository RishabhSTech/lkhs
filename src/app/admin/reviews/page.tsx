import Link from "next/link";
import type { ReviewStatus } from "@prisma/client";
import { MessageSquare, Star, TrendingUp } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { Panel } from "@/components/admin/panel";
import { ReviewRow, type AdminReview } from "@/components/admin/review-row";
import { ReviewImportForm } from "@/components/admin/review-import-form";
import { db } from "@/lib/db";
import { nightsBetween, summariseReviews } from "@/lib/property/reviews";
import {
  REVIEW_TOPIC_BY_CODE,
  topicsForReview,
} from "@/lib/property/review-topics";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string; status?: ReviewStatus }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published", status: "PUBLISHED" },
  { value: "pending", label: "Pending", status: "PENDING" },
  { value: "hidden", label: "Hidden", status: "HIDDEN" },
];

export default async function AdminReviewsPage({
  searchParams,
}: PageProps<"/admin/reviews">) {
  const params = await searchParams;
  const filter = typeof params.status === "string" ? params.status : "all";
  const propertyFilter =
    typeof params.property === "string" ? params.property : undefined;
  const status = FILTERS.find((f) => f.value === filter)?.status;

  const [reviews, allScores, properties] = await Promise.all([
    db.review.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(propertyFilter ? { propertyId: propertyFilter } : {}),
      },
      include: {
        property: { select: { id: true, name: true, slug: true } },
        guest: { select: { name: true } },
        reservation: { select: { code: true, checkIn: true, checkOut: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    db.review.findMany({
      where: { status: "PUBLISHED" },
      select: {
        rating: true,
        cleanliness: true,
        accuracy: true,
        checkIn: true,
        communication: true,
        location: true,
        value: true,
      },
    }),
    db.property.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const summary = summariseReviews(allScores);
  const pendingCount = await db.review.count({ where: { status: "PENDING" } });
  const replied = reviews.filter((r) => r.response).length;

  const rows: AdminReview[] = reviews.map((review) => ({
    id: review.id,
    propertyId: review.property.id,
    propertyName: review.property.name,
    propertySlug: review.property.slug,
    author: review.guest?.name ?? review.authorName ?? "Lime Kraft guest",
    isGuestReview: review.guestId !== null,
    bookingCode: review.reservation?.code ?? null,
    rating: review.rating,
    title: review.title,
    body: review.body,
    nights: review.reservation
      ? nightsBetween(review.reservation.checkIn, review.reservation.checkOut)
      : review.nightsStayed,
    stayedOn: (
      review.stayedOn ??
      review.reservation?.checkOut ??
      review.createdAt
    ).toISOString(),
    tripType: review.tripType,
    source: review.source,
    status: review.status,
    isFeatured: review.isFeatured,
    response: review.response,
    topics: topicsForReview(review).map((code) => {
      const topic = REVIEW_TOPIC_BY_CODE.get(code)!;
      return {
        code,
        label: topic.label,
        emoji: topic.emoji,
        inferred: (review.topics ?? []).length === 0,
      };
    }),
  }));

  function href(next: { status?: string; property?: string }) {
    const search = new URLSearchParams();
    const nextStatus = next.status ?? filter;
    const nextProperty =
      next.property === "" ? undefined : (next.property ?? propertyFilter);
    if (nextStatus && nextStatus !== "all") search.set("status", nextStatus);
    if (nextProperty) search.set("property", nextProperty);
    const query = search.toString();
    return query ? `/admin/reviews?${query}` : "/admin/reviews";
  }

  return (
    <AdminPage>
      <PageHeader
        title="Reviews"
        description="Everything guests have said, across the site and the channels."
        actions={<ReviewImportForm properties={properties} />}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Average rating"
          value={summary.average ? summary.average.toFixed(2) : "-"}
          hint={`${summary.count} published`}
          icon={Star}
        />
        <KpiCard
          label="5-star share"
          value={
            summary.count
              ? `${Math.round((summary.distribution[4] / summary.count) * 100)}%`
              : "-"
          }
          icon={TrendingUp}
        />
        <KpiCard
          label="Awaiting moderation"
          value={String(pendingCount)}
          tone={pendingCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Replied to"
          value={`${replied}/${rows.length}`}
          hint="Of the reviews shown"
          icon={MessageSquare}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((option) => (
          <Link
            key={option.value}
            href={href({ status: option.value })}
            className={cn(
              "inline-flex h-8 items-center rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors",
              filter === option.value
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </Link>
        ))}

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Link
          href={href({ property: "" })}
          className={cn(
            "inline-flex h-8 items-center rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors",
            !propertyFilter
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          All homes
        </Link>
        {properties.map((property) => (
          <Link
            key={property.id}
            href={href({ property: property.id })}
            className={cn(
              "inline-flex h-8 items-center rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors",
              propertyFilter === property.id
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {property.name}
          </Link>
        ))}
      </div>

      <Panel className="mt-5" flush>
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Nothing here yet. Guest reviews appear automatically once a stay is
            over; anything from the channels can be added by hand.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((review) => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </ul>
        )}
      </Panel>
    </AdminPage>
  );
}
