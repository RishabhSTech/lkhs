import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/site/empty-state";
import { WriteReview } from "@/components/property/reviews/write-review";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { differenceInNights, todayUTC } from "@/lib/dates";
import { STATUS_LABELS, statusBadgeClass } from "@/lib/admin/sources";
import { formatDateRange, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My trips",
  robots: { index: false },
};

export default async function TripsPage() {
  const session = await getSession();

  const reservations = session
    ? await db.reservation.findMany({
        where: { guest: { userId: session.userId } },
        include: {
          property: {
            include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
          },
          review: { select: { id: true } },
        },
        orderBy: { checkIn: "desc" },
      })
    : [];

  const today = todayUTC();
  const upcoming = reservations.filter(
    (r) => r.checkOut >= today && r.status !== "CANCELLED",
  );
  const past = reservations.filter(
    (r) => r.checkOut < today && r.status !== "CANCELLED",
  );
  const cancelled = reservations.filter((r) => r.status === "CANCELLED");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
          <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
            My trips
          </h1>

          {!session ? (
            <EmptyState
              className="mt-8"
              title="Sign in to see your trips"
              description="We'll text or email you a six-digit code. There is no password to remember."
              action={{ href: "/signin", label: "Sign in" }}
            />
          ) : (
            <Tabs defaultValue="upcoming" className="mt-6">
              <TabsList>
                <TabsTrigger value="upcoming">
                  Upcoming ({upcoming.length})
                </TabsTrigger>
                <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
                <TabsTrigger value="cancelled">
                  Cancelled ({cancelled.length})
                </TabsTrigger>
              </TabsList>

              {[
                { value: "upcoming", list: upcoming, empty: "Nothing booked yet." },
                { value: "past", list: past, empty: "No stays behind you yet." },
                { value: "cancelled", list: cancelled, empty: "Nothing cancelled - long may it last." },
              ].map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-5">
                  {tab.list.length === 0 ? (
                    <EmptyState
                      title={tab.empty}
                      description="Every Lime Kraft booking lands here - dates, address and invoice in one place."
                      action={{ href: "/stays", label: "Browse stays" }}
                    />
                  ) : (
                    <ul className="space-y-4">
                      {tab.list.map((r) => (
                        <li
                          key={r.id}
                          className="overflow-hidden rounded-xl border border-border bg-card sm:flex"
                        >
                          {r.property.images[0] && (
                            <div className="relative aspect-[16/9] sm:aspect-auto sm:w-48 sm:shrink-0">
                              <Image
                                src={r.property.images[0].url}
                                alt={r.property.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 12rem"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h2 className="font-heading text-lg text-foreground">
                                  {r.property.name}
                                </h2>
                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="size-3" />
                                  {r.property.locationArea}, {r.property.city}
                                </p>
                              </div>
                              <Badge className={statusBadgeClass(r.status)}>
                                {STATUS_LABELS[r.status]}
                              </Badge>
                            </div>

                            <p className="mt-3 text-sm text-foreground">
                              {formatDateRange(r.checkIn, r.checkOut)}
                              <span className="text-muted-foreground">
                                {" "}
                                · {r.adults} guests · {formatINR(Number(r.total))}
                              </span>
                            </p>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                              {r.code}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                render={
                                  <Link href={`/booking-confirmation/${r.code}`} />
                                }
                                size="sm"
                              >
                                View booking
                              </Button>
                              {r.checkOut < today &&
                                r.status !== "CANCELLED" &&
                                !r.review && (
                                  <WriteReview
                                    stay={{
                                      reservationId: r.id,
                                      code: r.code,
                                      propertyName: r.property.name,
                                      checkOut: r.checkOut.toISOString(),
                                      nights: differenceInNights(
                                        r.checkIn,
                                        r.checkOut,
                                      ),
                                    }}
                                    variant="outline"
                                    className="h-8 px-3 text-sm"
                                  />
                                )}
                              <Button
                                render={<Link href="/contact" />}
                                variant="outline"
                                size="sm"
                              >
                                Contact Lime Kraft
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>
    </>
  );
}
