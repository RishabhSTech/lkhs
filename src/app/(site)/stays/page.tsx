import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SearchPanel } from "@/components/site/search-panel";
import { PropertyCard } from "@/components/property/property-card";
import { Reveal } from "@/components/site/reveal";
import { getDistinctAreas, getPropertyCards } from "@/lib/queries/properties";
import { EmptyState } from "@/components/site/empty-state";
import { AreaFilter } from "@/components/property/area-filter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All stays",
  description:
    "Browse every Lime Kraft home across Indore — apartments, villas and family houses, all run by our own team.",
  alternates: { canonical: "/stays" },
};

export default async function StaysPage({ searchParams }: PageProps<"/stays">) {
  const params = await searchParams;
  const area = typeof params.area === "string" ? params.area : undefined;
  const guests =
    typeof params.guests === "string" ? Number(params.guests) || undefined : undefined;
  const checkIn = typeof params.checkIn === "string" ? params.checkIn : undefined;
  const checkOut = typeof params.checkOut === "string" ? params.checkOut : undefined;

  const [properties, areas] = await Promise.all([
    getPropertyCards({ area, guests }),
    getDistinctAreas(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <h1 className="font-heading text-4xl leading-tight text-brand-green sm:text-5xl">
              Every Lime Kraft home
            </h1>
            <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
              Five homes across Indore. Pick your dates and we'll show you what's
              free.
            </p>
            <div className="mt-7">
              <SearchPanel
                variant="inline"
                defaults={{ where: area, checkIn, checkOut, guests }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-brand-ink">
                {properties.length}
              </span>{" "}
              {properties.length === 1 ? "home" : "homes"}
              {area ? ` in ${area}` : " available"}
              {guests ? ` for ${guests} guests` : ""}
            </p>
            <AreaFilter areas={areas} active={area} />
          </div>

          {properties.length === 0 ? (
            <EmptyState
              className="mt-12"
              title="No homes match those filters"
              description="Try widening the area or reducing the number of guests — we only have five homes, so the filters bite quickly."
              action={{ href: "/stays", label: "Clear filters" }}
            />
          ) : (
            <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property, i) => (
                <Reveal key={property.slug} delay={Math.min(i * 0.05, 0.2)}>
                  <PropertyCard property={property} priority={i < 3} />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
