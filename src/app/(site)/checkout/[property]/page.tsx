import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { CheckoutFlow } from "@/components/booking/checkout-flow";
import { getPropertyBySlug } from "@/lib/queries/properties";
import { db } from "@/lib/db";
import { buildQuote } from "@/lib/pricing/engine";
import { getBlockedDates, isPropertyAvailable } from "@/lib/booking/availability";
import { addMonths, parseISODate, toISODate, todayUTC } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request your booking",
  robots: { index: false },
};

export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps<"/checkout/[property]">) {
  const { property: slug } = await params;
  if (!slug) notFound();
  const query = await searchParams;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

  const checkIn = typeof query.checkIn === "string" ? query.checkIn : "";
  const checkOut = typeof query.checkOut === "string" ? query.checkOut : "";

  const from = todayUTC();
  const to = addMonths(from, 12);

  // Pre-fetch what the client would otherwise ask for right after this page
  // paints - the guest just picked these dates on the property page, so
  // repeating the availability + quote round trip here only adds a second
  // round of spinners for data that hasn't changed.
  const [blockedDates, priced] = await Promise.all([
    getBlockedDates(property.id, from, to),
    checkIn && checkOut && checkOut > checkIn
      ? priceStay(property.id, checkIn, checkOut)
      : Promise.resolve(null),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1 pb-10">
        <CheckoutFlow
          property={{
            id: property.id,
            slug: property.slug,
            name: property.name,
            locationArea: property.locationArea,
            city: property.city,
            heroImage: property.images[0]?.url ?? "",
            maxGuests: property.maxGuests,
            basePrice: property.basePriceNumber,
          }}
          initial={{
            checkIn,
            checkOut,
            guests:
              typeof query.guests === "string" ? Number(query.guests) || 2 : 2,
            quote: priced?.quote ?? null,
            available: priced?.available ?? null,
            blockedDates,
          }}
        />
      </main>
    </>
  );
}

async function priceStay(propertyId: string, checkInISO: string, checkOutISO: string) {
  const checkIn = parseISODate(checkInISO);
  const checkOut = parseISODate(checkOutISO);

  const property = await db.property.findUnique({
    where: { id: propertyId },
    include: { pricingRules: { where: { isActive: true } } },
  });
  if (!property) return null;

  const overrides = await db.dailyRate.findMany({
    where: { propertyId, date: { gte: checkIn, lt: checkOut } },
  });

  const quote = buildQuote({
    basePrice: Number(property.basePrice),
    cleaningFee: Number(property.cleaningFee),
    checkIn,
    checkOut,
    rules: property.pricingRules,
    dailyRateOverrides: Object.fromEntries(
      overrides.map((o) => [toISODate(o.date), Number(o.price)]),
    ),
  });

  const available = await isPropertyAvailable(propertyId, checkIn, checkOut);

  return { quote, available };
}
