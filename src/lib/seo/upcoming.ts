/**
 * Cities we have announced but not yet opened.
 *
 * Every location on the public site is otherwise derived from ACTIVE
 * inventory - see `lib/queries/locations` - which is the right default and the
 * reason a new city needs no code to appear. The gap it leaves is the weeks
 * between signing homes in a new city and putting them on sale, when the
 * honest thing to say is "we are opening here" and the site has no way to say
 * it at all.
 *
 * This is that, and deliberately nothing more: a name, where the first homes
 * are, and a sentence. No price, no count of bookable homes, no link to a
 * search that would return nothing - an announcement, not fake inventory.
 *
 * It removes itself. `pendingCities()` drops any city that has live homes, so
 * the day the first Goa listing goes ACTIVE the announcement tile disappears
 * and the real, bookable Goa card takes its place with no deploy.
 */
export type UpcomingCity = {
  slug: string;
  name: string;
  state: string;
  /** Where the first homes actually are. Named, because vagueness reads as spin. */
  areas: string[];
  /** One sentence, on the tile. */
  blurb: string;
  /** When we expect to be taking bookings. Kept coarse on purpose. */
  opening: string;
  image: string;
};

/**
 * EDIT THIS LIST, not the pages that read it.
 *
 * `blurb` and `opening` are the only claims on the site about a city that is
 * not yet on sale, and they are printed verbatim - check both are still true
 * before a deploy. Everything the pages generate around them ("Goa is opening
 * next") is deliberately vague enough to survive a slipped date; these two
 * fields are not, which is the point of keeping them in one file.
 */
export const UPCOMING_CITIES: UpcomingCity[] = [
  {
    slug: "goa",
    name: "Goa",
    state: "Goa",
    areas: ["Assagao", "Siolim", "Panjim"],
    blurb:
      "Two houses in North Goa are being fitted out now - a garden villa in Assagao and a restored Portuguese home on the Chapora at Siolim.",
    opening: "Taking bookings this season",
    // Assagao. Checked by looking at the photograph, like every other image on
    // this site.
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
  },
];

/**
 * The announcements still worth making, given what is actually on sale.
 *
 * Pass the live city list. Anything already open is filtered out, so the two
 * lists can never contradict each other on the same page.
 */
export function pendingCities(live: { slug: string }[]): UpcomingCity[] {
  const open = new Set(live.map((city) => city.slug));
  return UPCOMING_CITIES.filter((city) => !open.has(city.slug));
}
