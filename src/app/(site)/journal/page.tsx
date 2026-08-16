import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site/site-header";
import { Reveal } from "@/components/site/reveal";
import { JOURNAL_POSTS } from "../../../../prisma/seed-data";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Notes from the Lime Kraft team on how we choose homes, what to do in Indore, and how we price.",
  alternates: { canonical: "/journal" },
};

export default function JournalPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="border-b border-border bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
            <h1 className="font-heading text-4xl leading-tight text-brand-green sm:text-5xl">
              Journal
            </h1>
            <p className="mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-muted-foreground">
              Notes on the homes, the city and how we run things.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="space-y-10">
            {JOURNAL_POSTS.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.06}>
                <Link
                  href={`/journal/${post.slug}`}
                  className="group grid gap-5 sm:grid-cols-[16rem_1fr] sm:items-center"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 16rem"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                  <div>
                    <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-brand-sage uppercase">
                      {post.readMinutes} min read
                    </p>
                    <h2 className="mt-2 font-heading text-2xl leading-snug text-brand-green">
                      {post.title}
                    </h2>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
