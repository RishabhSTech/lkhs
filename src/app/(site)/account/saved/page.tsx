import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { PropertyCard } from "@/components/property/property-card";
import { EmptyState } from "@/components/site/empty-state";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getPropertyCards } from "@/lib/queries/properties";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved stays",
  robots: { index: false },
};

export default async function SavedPage() {
  const session = await getSession();

  const savedSlugs = session
    ? (
        await db.wishlist.findMany({
          where: { guest: { userId: session.userId } },
          include: { property: { select: { slug: true } } },
        })
      ).map((w) => w.property.slug)
    : [];

  const all = await getPropertyCards({ savedSlugs });
  const saved = all.filter((p) => savedSlugs.includes(p.slug));

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <h1 className="font-heading text-3xl leading-tight text-brand-green sm:text-4xl">
            Saved stays
          </h1>

          {saved.length === 0 ? (
            <EmptyState
              className="mt-8"
              title="Nothing saved yet"
              description={
                session
                  ? "Tap the heart on any home to keep it here for later."
                  : "Sign in and tap the heart on any home to keep it here for later."
              }
              action={{ href: "/stays", label: "Browse stays" }}
            />
          ) : (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((property, i) => (
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
