import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Section, SectionHeading } from "@/components/site/section";
import { Reveal, RevealGroup } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";
import { getCities } from "@/lib/queries/locations";
import { pendingCities } from "@/lib/seo/upcoming";

/** Near-static copy over a couple of inventory counts. */
export const revalidate = 3600;

/** "Indore"; "Indore and Goa"; "Indore, Goa and Jaipur". */
function joinCities(names: string[]) {
  if (names.length === 0) return "India";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const cities = await getCities().catch(() => []);
  const where = joinCities(cities.map((c) => c.name));

  return {
    title: "About",
    description: `Lime Kraft Home Stays runs a small collection of boutique villas, apartments and homes across ${where} - set up, styled and maintained by our own team.`,
    alternates: { canonical: "/about" },
  };
}

function principles(homes: number, cities: number) {
  return [
    {
      title: "We stay in every home first",
      body: "Before a home joins the collection, someone from the team sleeps there. You learn more between 11pm and 7am than in any daytime viewing.",
    },
    {
      title: "We run them ourselves",
      body: "No outsourced management. The same people who set up a home handle its turnovers, its maintenance and its guests.",
    },
    {
      title: "We price honestly",
      body: "The number you see when you search is the number you pay, plus tax. No resort fees, no drip pricing, no surprises at checkout.",
    },
    {
      title: "We keep it small",
      // Counted off the database. This line used to read "Five homes today",
      // which was quietly wrong the moment a sixth home went live - and this
      // is the page where a stale number costs the most trust.
      body: `${homes} ${homes === 1 ? "home" : "homes"}${
        cities > 1 ? ` across ${cities} cities` : ""
      } today. We would rather run a handful properly than a hundred badly.`,
    },
  ];
}

export default async function AboutPage() {
  const cities = await getCities().catch(() => []);
  const homes = cities.reduce((sum, c) => sum + c.propertyCount, 0);
  const PRINCIPLES = principles(homes, cities.length);

  const expansionLine =
    `That collection now runs across ${joinCities(cities.map((c) => c.name))}. ` +
    "Every home is still set up, styled and looked after by the same team - " +
    "we open a new city when we can staff it properly, not when the " +
    "spreadsheet says to.";

  // The line above earns its keep only if we are willing to name what is
  // actually next. Pulled from the same announcement list the destinations
  // pages read, so this page cannot promise a city those have stopped
  // mentioning - or keep promising one that has already opened.
  const opening = pendingCities(cities);
  const openingLine =
    opening.length === 0
      ? null
      : // One city names its own neighbourhoods; several have to be qualified,
        // or the list reads as areas of whichever city was mentioned last.
        (opening.length === 1
          ? `${opening[0].name} is next - ${joinCities(opening[0].areas)}, `
          : `${joinCities(opening.map((c) => c.name))} are next - ` +
            `${opening
              .map((c) => `${joinCities(c.areas.slice(0, 2))} in ${c.name}`)
              .join("; ")}, `) +
        "readied by the same team that set up every home before them. " +
        "The dates go on sale here before they go anywhere else.";

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-brand-mist uppercase">
              About Lime Kraft
            </p>
            <h1 className="mt-3 max-w-2xl font-heading text-4xl leading-tight text-foreground sm:text-5xl">
              Boutique hospitality, run by people who actually live here.
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
              Lime Kraft Home Stays began with one apartment in Vijay Nagar and a
              simple frustration: everything available in Indore was either a
              business hotel with no soul or an apartment listing with no
              standards. We wanted somewhere that felt like a home and ran like a
              hotel.
            </p>
            {cities.length > 1 && (
              <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
                {expansionLine}
              </p>
            )}
            {openingLine && (
              <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
                {openingLine}
              </p>
            )}
          </div>
        </div>

        <Section>
          <Reveal>
            <SectionHeading eyebrow="How we work" title="Four things we don't compromise on" />
          </Reveal>
          <RevealGroup className="mt-9 grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <div
                key={principle.title}
                className="h-full rounded-2xl border border-border bg-card p-6"
              >
                <h2 className="font-display-sm text-xl text-foreground">
                  {principle.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {principle.body}
                </p>
              </div>
            ))}
          </RevealGroup>
        </Section>

        <Section className="border-y border-border bg-muted/40">
          <Reveal>
            <div className="rounded-3xl bg-brand-blue px-6 py-16 text-center sm:px-12">
              <h2 className="mx-auto max-w-lg font-display text-[2.25rem] text-white sm:text-[3rem]">
                Come and see for yourself.
              </h2>
              <Button
                render={<Link href="/stays" />}
                variant="accent"
                size="xl"
                className="mt-7"
              >
                Browse the homes
                <ArrowRight />
              </Button>
            </div>
          </Reveal>
        </Section>
      </main>
    </>
  );
}
