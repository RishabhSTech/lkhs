import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Reveal, RevealGroup } from "@/components/site/reveal";
import { JsonLd } from "@/components/seo/json-ld";
import { getCities } from "@/lib/queries/locations";
import { COLLECTIONS, COLLECTION_KINDS } from "@/lib/seo/collections";
import { pendingCities } from "@/lib/seo/upcoming";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";

/** Derived entirely from active inventory; changes when a property does. */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const cities = await getCities().catch(() => []);
  const names = cities.map((c) => c.name);
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : (names[0] ?? "India");

  const opening = pendingCities(cities).map((c) => c.name);

  return {
    title: "Destinations",
    description:
      `Every city where Lime Kraft runs homes - ${list}. Villas, serviced apartments and whole houses, booked direct.` +
      (opening.length > 0 ? ` ${opening.join(" and ")} opening soon.` : ""),
    alternates: { canonical: "/destinations" },
  };
}

/**
 * The city index. This is the hub of the location hierarchy: it links down to
 * every city hub, and each hub links on to its type pages, so the whole SEO
 * matrix is reachable in two clicks from here.
 */
export default async function DestinationsPage() {
  const [cities, typeCounts] = await Promise.all([
    getCities(),
    db.property.groupBy({
      by: ["city", "propertyType"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  // Announced, not yet on sale. Filtered against live inventory, so a city
  // never appears in both lists on the same page.
  const upcoming = pendingCities(cities);

  const trail = [
    { name: "Home", href: "/" },
    { name: "Destinations", href: "/destinations" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(trail)} />
      <SiteHeader />

      <main className="flex-1">
        <div className="border-b border-border bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:py-14">
            <Breadcrumbs trail={trail} />
            <h1 className="mt-6 font-display text-[2.25rem] text-foreground sm:text-[3rem]">
              Where you&apos;ll find us
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              {cities.length === 1
                ? `Every Lime Kraft home is in ${cities[0].name} today, set up and run by our own team.`
                : `Homes across ${cities.length} cities, each one set up and run by our own team.`}
              {upcoming.length > 0 &&
                ` ${upcoming.map((c) => c.name).join(" and ")} ${upcoming.length === 1 ? "is" : "are"} opening next - the dates go on sale here before they go anywhere else.`}
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-6 lg:py-16">
          <RevealGroup className="grid gap-8 sm:grid-cols-2">
            {cities.map((city) => {
              const kinds = COLLECTION_KINDS.filter((kind) => {
                const spec = COLLECTIONS[kind];
                if (spec.propertyType === null) return false;
                return typeCounts.some(
                  (t) =>
                    t.city === city.name &&
                    t.propertyType === spec.propertyType &&
                    t._count._all > 0,
                );
              });

              return (
                <div key={city.slug}>
                  <Link
                    href={`/stays-in-${city.slug}`}
                    className="group block overflow-hidden rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                      {city.image && (
                        <Image
                          src={city.image}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/85 via-brand-ink/20 to-transparent" />
                      <div className="absolute inset-x-6 bottom-6">
                        <h2 className="font-display text-3xl text-white">
                          {city.name}
                        </h2>
                        <p className="mt-1.5 text-sm text-white/80">
                          {city.propertyCount}{" "}
                          {city.propertyCount === 1 ? "home" : "homes"} ·{" "}
                          {city.state}
                          {city.minPrice !== null &&
                            ` · from ${formatINR(city.minPrice)} a night`}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {/* Straight into the type pages for this city. */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {kinds.map((kind) => (
                      <Link
                        key={kind}
                        href={`/${kind}-in-${city.slug}`}
                        className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:border-brand-azure hover:text-brand-azure"
                      >
                        {COLLECTIONS[kind].plural}
                      </Link>
                    ))}
                  </div>

                  {city.areas.length > 0 && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {city.areas.slice(0, 5).join(" · ")}
                    </p>
                  )}

                  <Link
                    href={`/stays-in-${city.slug}`}
                    className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-brand-azure"
                  >
                    All stays in {city.name}
                    <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              );
            })}
          </RevealGroup>

          {cities.length === 0 && (
            <Reveal>
              <p className="text-sm text-muted-foreground">
                No homes are on sale this minute. Message us and we will tell
                you the day that changes.
              </p>
            </Reveal>
          )}

          {/* Opening next. Set apart from the grid above rather than mixed
              into it: these have no homes to count, no rate to quote and no
              page to link to, and a card that looks bookable but is not costs
              more trust than the announcement earns. */}
          {upcoming.length > 0 && (
            <div className="mt-14 border-t border-border pt-12 lg:mt-20">
              <Reveal>
                <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-brand-mist uppercase">
                  Opening next
                </p>
              </Reveal>
              <RevealGroup className="mt-7 grid gap-8 sm:grid-cols-2">
                {upcoming.map((city) => (
                  <div key={city.slug}>
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                      <Image
                        src={city.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover saturate-[0.6]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/85 via-brand-ink/20 to-transparent" />
                      <span className="absolute top-5 left-6 rounded-full bg-brand-gold px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.12em] text-brand-blue uppercase">
                        {city.opening}
                      </span>
                      <div className="absolute inset-x-6 bottom-6">
                        <h2 className="font-display text-3xl text-white">
                          {city.name}
                        </h2>
                        <p className="mt-1.5 text-sm text-white/80">
                          {city.areas.join(" · ")} · {city.state}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                      {city.blurb}
                    </p>

                    <Link
                      href="/contact"
                      className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-brand-azure"
                    >
                      Tell us your {city.name} dates
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                ))}
              </RevealGroup>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
