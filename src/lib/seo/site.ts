/**
 * One place for the identity strings that appear in metadata, structured data
 * and the sitemap. Anything hard-coded in two of those three drifts.
 */
export const SITE = {
  name: "Lime Kraft Home Stays",
  shortName: "Lime Kraft",
  /** Falls back to localhost so previews and tests still produce absolute URLs. */
  url: process.env.APP_URL ?? "http://localhost:3000",
  description:
    "Boutique serviced homes, villas and apartments across India — booked direct, with no channel mark-up and a real person on WhatsApp throughout.",
  locale: "en_IN",
  currency: "INR",
  country: "IN",
} as const;

export function absoluteUrl(path: string) {
  return new URL(path, SITE.url).toString();
}
