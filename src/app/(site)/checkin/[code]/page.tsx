import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { IdCard, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { EmptyState } from "@/components/site/empty-state";
import { DigitalCheckinForm } from "@/components/booking/digital-checkin-form";
import { db } from "@/lib/db";
import { clientIp, isOverLimit } from "@/lib/rate-limit";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Digital check-in",
  robots: { index: false },
};

/** Public, unauthenticated lookup by `code`, same defence as the
 * booking-confirmation page this mirrors (see that page's comment). */
async function isRateLimited(): Promise<boolean> {
  const hdrs = await headers();
  const key = `ratelimit:checkin-page:${clientIp(hdrs)}`;
  return isOverLimit(key, { limit: 30, windowSeconds: 600 });
}

export default async function DigitalCheckinPage({
  params,
}: PageProps<"/checkin/[code]">) {
  const { code } = await params;

  if (await isRateLimited()) notFound();

  const reservation = await db.reservation.findUnique({
    where: { code },
    include: {
      property: {
        select: { name: true, locationArea: true, city: true },
      },
      reservationGuests: {
        orderBy: { isPrimary: "desc" },
        select: {
          id: true,
          name: true,
          isPrimary: true,
          idType: true,
          idNumber: true,
          idDocumentUrl: true,
          checkedInAt: true,
        },
      },
    },
  });
  if (!reservation) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:py-16">
          <div className="text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-brand-blue">
              <IdCard className="size-7 text-brand-ivory" strokeWidth={2.25} />
            </div>
            <h1 className="mt-6 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
              Digital check-in
            </h1>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {reservation.property.name} · {reservation.property.locationArea}, {reservation.property.city}
            </p>
          </div>

          <div className="mt-8">
            {reservation.status === "CANCELLED" ? (
              <EmptyState
                title="This booking was cancelled"
                description="Digital check-in isn't needed - if this doesn't look right, message us with your booking reference."
              />
            ) : reservation.status === "PENDING" ? (
              <EmptyState
                title="Not confirmed yet"
                description="Digital check-in opens once your booking is confirmed and paid - we'll email you this link fresh at that point."
              />
            ) : (
              <DigitalCheckinForm
                code={reservation.code}
                adults={reservation.adults}
                arriveBy={formatDateLong(reservation.checkIn)}
                initialGuests={reservation.reservationGuests.map((g) => ({
                  name: g.name,
                  idType: g.idType,
                  idNumber: g.idNumber,
                  idDocumentUrl: g.idDocumentUrl,
                }))}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
