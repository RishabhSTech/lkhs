/**
 * Slug helpers shared by server queries and client components, so this file
 * must stay free of server-only imports.
 *
 * Slugs are never reversed back into names by string surgery — "new-delhi"
 * could be "New Delhi" or "New-Delhi", and guessing wrong produces a page that
 * quietly queries nothing. Resolution always compares `slugify(value)` against
 * the real values held in the database.
 */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Finds the original value whose slug matches, or null. */
export function resolveBySlug<T>(
  items: T[],
  slug: string,
  toValue: (item: T) => string,
) {
  const wanted = slugify(slug);
  return items.find((item) => slugify(toValue(item)) === wanted) ?? null;
}
