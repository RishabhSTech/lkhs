import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { Reveal } from "@/components/site/reveal";
import { db } from "@/lib/db";
import { DESTINATIONS } from "../../../../prisma/seed-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Where Lime Kraft homes are across Indore — Vijay Nagar, Palasia, Central Indore, Rau and Bicholi Mardana.",
  alternates: { canonical: "/destinations" },
};

export default async function DestinationsPage() {
  const counts = await db.property.groupBy({
    by: ["locationArea"],
    where: { status: "ACTIVE" },
    _count: true,
  });
  const countByArea = new Map(counts.map((c) => [c.locationArea, c._count]));

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
            <h1 className="font-heading text-4xl leading-tight text-foreground sm:text-5xl">
              Where we are
            </h1>
            <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
              Five neighbourhoods across Indore, each with a different pace.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS.map((destination, i) => {
              const count = countByArea.get(destination.name) ?? 0;
              return (
                <Reveal key={destination.slug} delay={i * 0.05}>
                  <Link
                    href={`/destinations/${destination.slug}`}
                    className="group block overflow-hidden rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                      <Image
                        src={destination.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/80 via-brand-ink/15 to-transparent" />
                      <div className="absolute inset-x-5 bottom-5">
                        <h2 className="font-heading text-2xl text-white">
                          {destination.name}
                        </h2>
                        <p className="mt-1 text-sm text-white/80">
                          {count} {count === 1 ? "home" : "homes"}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {destination.blurb}
                    </p>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
