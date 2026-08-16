import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState } from "@/components/site/empty-state";
import { getPropertyCards } from "@/lib/queries/properties";
import { DESTINATIONS } from "../../../../../prisma/seed-data";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/destinations/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const destination = DESTINATIONS.find((d) => d.slug === slug);
  if (!destination) return { title: "Destination not found" };

  return {
    title: `Stays in ${destination.name}`,
    description: destination.blurb,
    alternates: { canonical: `/destinations/${destination.slug}` },
  };
}

export default async function DestinationPage({
  params,
}: PageProps<"/destinations/[slug]">) {
  const { slug } = await params;
  const destination = DESTINATIONS.find((d) => d.slug === slug);
  if (!destination) notFound();

  const properties = await getPropertyCards({ area: destination.name });

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="relative h-64 sm:h-80">
          <Image
            src={destination.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/80 to-brand-ink/25" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
              <h1 className="font-heading text-4xl leading-tight text-white sm:text-5xl">
                {destination.name}
              </h1>
              <p className="mt-2 max-w-lg text-sm text-white/80">
                {destination.blurb}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            All destinations
          </Link>

          <h2 className="mt-6 font-heading text-2xl text-foreground">
            {properties.length} {properties.length === 1 ? "home" : "homes"} here
          </h2>

          {properties.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="No homes here yet"
              description="We're still looking in this neighbourhood. Try another destination in the meantime."
              action={{ href: "/stays", label: "Browse all stays" }}
            />
          ) : (
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, i) => (
                <PropertyCard
                  key={property.slug}
                  property={property}
                  priority={i < 3}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
