import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { CheckoutFlow } from "@/components/booking/checkout-flow";
import { getPropertyBySlug } from "@/lib/queries/properties";
import { PAYMENT_PROVIDER_IS_MOCK } from "@/lib/payments/provider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Complete your booking",
  robots: { index: false },
};

export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps<"/checkout/[property]">) {
  const { property: slug } = await params;
  const query = await searchParams;
  const property = await getPropertyBySlug(slug);
  if (!property) notFound();

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
            checkIn: typeof query.checkIn === "string" ? query.checkIn : "",
            checkOut: typeof query.checkOut === "string" ? query.checkOut : "",
            guests:
              typeof query.guests === "string" ? Number(query.guests) || 2 : 2,
          }}
          isMockPayment={PAYMENT_PROVIDER_IS_MOCK}
        />
      </main>
    </>
  );
}
