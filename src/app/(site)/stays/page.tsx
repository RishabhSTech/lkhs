import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/site-header";
import { SearchPanel } from "@/components/site/search-panel";
import { PropertyCard } from "@/components/property/property-card";
import { Reveal } from "@/components/site/reveal";
import { getDistinctAreas, getPropertyCards } from "@/lib/queries/properties";
import { getAreasByCity, getCities } from "@/lib/queries/locations";
import { EmptyState } from "@/components/site/empty-state";
import { AreaFilter } from "@/components/property/area-filter";

export const dynamic = "force-dynamic";

/**
 * `/stays` is the working search surface, not a landing page. Any filtered
 * state is kept out of the index — those queries are served far better by the
 * `/villas-in-<city>` pages, and letting a faceted URL space into the index
 * spends crawl budget on thousands of near-duplicates.
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/stays">): Promise<Metadata> {
  const params = await searchParams;
  const filtered = ["area", "city", "guests", "checkIn", "checkOut", "category"].some(
    (key) => typeof params[key] === "string" && params[key] !== "",
  );

  return {
    title: "All stays",
    description:
      "Browse every Lime Kraft home — serviced apartments, private villas and family houses, all run by our own team.",
    alternates: { canonical: "/stays" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function StaysPage({ searchParams }: PageProps<"/stays">) {
  const params = await searchParams;
  const area = typeof params.area === "string" ? params.area : undefined;
  const city = typeof params.city === "string" ? params.city : undefined;
  const guests =
    typeof params.guests === "string" ? Number(params.guests) || undefined : undefined;
  const checkIn = typeof params.checkIn === "string" ? params.checkIn : undefined;
  const checkOut = typeof params.checkOut === "string" ? params.checkOut : undefined;

  const [properties, areas, areasByCity, cities] = await Promise.all([
    getPropertyCards({ area, city, guests }),
    getDistinctAreas(),
    getAreasByCity(),
    getCities(),
  ]);

  const locations = [...areasByCity.values()].map((entry) => ({
    city: entry.city,
    areas: entry.areas,
  }));

  const scope = area ?? city;
  const totalHomes = cities.reduce((sum, c) => sum + c.propertyCount, 0);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
            <h1 className="font-heading text-4xl leading-tight text-foreground sm:text-5xl">
              Every Lime Kraft home
            </h1>
            <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
              {totalHomes} {totalHomes === 1 ? "home" : "homes"} across{" "}
              {cities.length === 1
                ? cities[0].name
                : `${cities.length} cities`}
              . Pick your dates and we&apos;ll show you what&apos;s free.
            </p>
            <div className="mt-7">
              <SearchPanel
                variant="inline"
                locations={locations}
                defaults={{ city, area, checkIn, checkOut, guests }}
              />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {properties.length}
              </span>{" "}
              {properties.length === 1 ? "home" : "homes"}
              {scope ? ` in ${scope}` : " available"}
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
