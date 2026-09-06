import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { getCities, getCollectionTargets } from "@/lib/queries/locations";
import { absoluteUrl } from "@/lib/seo/site";
import { slugify } from "@/lib/seo/slug";
import { DESTINATIONS, JOURNAL_POSTS } from "../../prisma/seed-data";

// Built from live inventory on request, so a newly activated property - or a
// whole new city - is in the sitemap immediately rather than at the next deploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/stays"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/destinations"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/journal"), lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const [cities, targets, properties] = await Promise.all([
    getCities().catch(() => []),
    getCollectionTargets().catch(() => []),
    db.property
      .findMany({
        where: { status: "ACTIVE" },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
  ]);

  // City hubs rank highest of the generated set, then the type pages, weighted
  // by how much inventory actually backs them - a page with one home should not
  // claim the same priority as one with forty.
  const maxCount = Math.max(1, ...targets.map((t) => t.count));

  const collectionEntries: MetadataRoute.Sitemap = targets.map((target) => ({
    url: absoluteUrl(`/${target.kind}-in-${target.citySlug}`),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority:
      target.kind === "stays"
        ? 0.9
        : Number((0.6 + 0.2 * (target.count / maxCount)).toFixed(2)),
  }));

  const propertyEntries: MetadataRoute.Sitemap = properties.map((property) => ({
    url: absoluteUrl(`/stays/${property.slug}`),
    lastModified: property.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Area pages only exist where we have editorial copy for them; the rest of
  // the areas are covered by their city hub.
  const citySlugs = new Set(cities.map((c) => c.slug));
  const destinationEntries: MetadataRoute.Sitemap = DESTINATIONS.filter(
    (destination) => !citySlugs.has(slugify(destination.name)),
  ).map((destination) => ({
    url: absoluteUrl(`/destinations/${destination.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const journalEntries: MetadataRoute.Sitemap = JOURNAL_POSTS.map((post) => ({
    url: absoluteUrl(`/journal/${post.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  return [
    ...staticEntries,
    ...collectionEntries,
    ...propertyEntries,
    ...destinationEntries,
    ...journalEntries,
  ];
}
