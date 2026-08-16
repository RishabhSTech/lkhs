import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { Section, SectionHeading } from "@/components/site/section";
import { Reveal } from "@/components/site/reveal";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About",
  description:
    "Lime Kraft Home Stays runs a small collection of boutique homes across Indore — set up, styled and maintained by our own team.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
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
    body: "Five homes today. We would rather run a handful properly than a hundred badly.",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
            <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-brand-sage uppercase">
              About Lime Kraft
            </p>
            <h1 className="mt-3 max-w-2xl font-heading text-4xl leading-tight text-brand-green sm:text-5xl">
              Boutique hospitality, run by people who actually live here.
            </h1>
            <p className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground">
              Lime Kraft Home Stays began with one apartment in Vijay Nagar and a
              simple frustration: everything available in Indore was either a
              business hotel with no soul or an apartment listing with no
              standards. We wanted somewhere that felt like a home and ran like a
              hotel.
            </p>
          </div>
        </div>

        <Section>
          <Reveal>
            <SectionHeading eyebrow="How we work" title="Four things we don't compromise on" />
          </Reveal>
          <div className="mt-9 grid gap-6 sm:grid-cols-2">
            {PRINCIPLES.map((principle, i) => (
              <Reveal key={principle.title} delay={i * 0.06}>
                <div className="h-full rounded-xl border border-border bg-white p-6">
                  <h2 className="font-heading text-xl text-brand-green">
                    {principle.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {principle.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </Section>

        <Section className="bg-white">
          <Reveal>
            <div className="rounded-2xl bg-brand-green px-6 py-14 text-center sm:px-12">
              <h2 className="mx-auto max-w-lg font-heading text-3xl leading-tight text-white sm:text-4xl">
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
