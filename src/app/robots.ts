import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private surfaces and anything that would burn crawl budget on
        // near-duplicate, personalised or transactional pages.
        disallow: [
          "/admin",
          "/stakeholder",
          "/account",
          "/api/",
          "/checkout/",
          "/booking-confirmation/",
          "/signin",
        ],
        // Deliberately NOT blocking filtered `/stays?...` URLs here. Those
        // carry `noindex` in their metadata, and a page blocked in robots.txt
        // is never crawled — so the noindex is never read, and the URL can
        // still be indexed from inbound links with no snippet at all. Blocking
        // and de-indexing are different jobs; only one of them can be used per
        // URL, and de-indexing is the one we want.
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
