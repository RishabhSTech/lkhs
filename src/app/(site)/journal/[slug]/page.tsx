import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { JOURNAL_POSTS } from "../../../../../prisma/seed-data";

export function generateStaticParams() {
  return JOURNAL_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = JOURNAL_POSTS.find((p) => p.slug === slug);
  if (!post) {
    // Root metadata sets index/follow, so a not-found state must opt out
    // explicitly or it advertises itself as indexable.
    return { title: "Post not found", robots: { index: false, follow: false } };
  }

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, images: [post.image] },
  };
}

export default async function JournalPostPage({
  params,
}: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const post = JOURNAL_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:py-14">
          <Link
            href="/journal"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to journal
          </Link>

          <p className="mt-6 text-[0.6875rem] font-semibold tracking-[0.16em] text-brand-mist uppercase">
            {post.readMinutes} min read
          </p>
          <h1 className="mt-2 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
            {post.title}
          </h1>

          <div className="relative mt-7 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
            <Image
              src={post.image}
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, 42rem"
              className="object-cover"
            />
          </div>

          <div className="mt-8 space-y-5 text-[1.0625rem] leading-relaxed text-foreground">
            {post.body.split("\n\n").map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}
