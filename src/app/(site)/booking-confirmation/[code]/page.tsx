import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, KeyRound, MapPin, Receipt, Users } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { ConfirmationHero } from "@/components/booking/confirmation-hero";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDateLong, formatDateRange, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking confirmed",
  robots: { index: false },
};

export default async function BookingConfirmationPage({
  params,
}: PageProps<"/booking-confirmation/[code]">) {
  const { code } = await params;

  const reservation = await db.reservation.findUnique({
    where: { code },
    include: {
      property: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      guest: true,
      payments: true,
    },
  });
  if (!reservation) notFound();

  const payment = reservation.payments[0];

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-16">
          <ConfirmationHero guestName={reservation.guest.name} />

          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-white">
            {reservation.property.images[0] && (
              <div className="relative aspect-[16/7]">
                <Image
                  src={reservation.property.images[0].url}
                  alt={reservation.property.name}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 48rem"
                  className="object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl text-brand-green">
                    {reservation.property.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {reservation.property.locationArea},{" "}
                    {reservation.property.city}
                  </p>
                </div>
                <div className="rounded-lg bg-brand-ivory px-3.5 py-2 text-right">
                  <p className="text-[0.625rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                    Booking ID
                  </p>
                  <p className="font-mono text-sm font-medium text-brand-green">
                    {reservation.code}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid gap-5 border-t border-border pt-6 sm:grid-cols-2">
                <Detail icon={CalendarDays} label="Dates">
                  {formatDateRange(reservation.checkIn, reservation.checkOut)}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {reservation.nights}{" "}
                    {reservation.nights === 1 ? "night" : "nights"}
                  </span>
                </Detail>

                <Detail icon={Users} label="Guests">
                  {reservation.adults}{" "}
                  {reservation.adults === 1 ? "adult" : "adults"}
                  {reservation.children > 0 && `, ${reservation.children} children`}
                </Detail>

                <Detail icon={Receipt} label="Payment">
                  {formatINR(Number(reservation.total))}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {payment
                      ? `${payment.method} · ${payment.status.toLowerCase()}`
                      : "Pending"}
                  </span>
                </Detail>

                <Detail icon={KeyRound} label="Check-in">
                  From 2:00 PM on {formatDateLong(reservation.checkIn)}
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Checkout by 11:00 AM
                  </span>
                </Detail>
              </dl>

              <div className="mt-6 rounded-lg bg-brand-ivory p-4 text-sm leading-relaxed text-muted-foreground">
                We've sent your confirmation
                {reservation.guest.email ? ` to ${reservation.guest.email}` : ""}.
                Access instructions and the exact address arrive three days before
                you travel.
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button render={<Link href="/account/trips" />} size="lg">
                  View my booking
                </Button>
                <Button
                  render={<Link href="/stays" />}
                  variant="outline"
                  size="lg"
                >
                  Browse more stays
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-sage" />
      <div>
        <dt className="text-[0.625rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="mt-1 text-sm font-medium text-brand-ink">{children}</dd>
      </div>
    </div>
  );
}
