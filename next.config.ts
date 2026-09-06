import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" },
    ],
    // AVIF first, WebP as the fallback. Order is significant: the first entry
    // that the browser's Accept header matches is the one served. Photography
    // is the bulk of this site's bytes, and AVIF is materially smaller than
    // WebP at the same perceptual quality.
    formats: ["image/avif", "image/webp"],
    // Source URLs are content-addressed (S3 keys) or Unsplash permalinks, so a
    // given URL never changes what it points at. The default 4h TTL made us
    // re-optimise the same photograph six times a day for nothing.
    minimumCacheTTL: 2678400, // 31 days
    qualities: [75],
  },

  // Tailwind's output is atomic and small (~22 kB gzip), so inlining it into
  // the document removes a render-blocking round trip on first visit - the
  // case that decides FCP/LCP for someone arriving from search. Returning
  // visitors lose the separately-cached stylesheet; at this size that trade is
  // clearly worth it.
  experimental: {
    // Prerendering now does real database work, and each worker process holds
    // its own connection pool. Fewer, fuller workers keeps the total number of
    // connections inside what the Supabase pooler allows; see `db-config.ts`.
    staticGenerationMinPagesPerWorker: 25,

    inlineCss: true,
    // `lucide-react`, `date-fns` and `recharts` are optimised by Next already;
    // `framer-motion` is not, and it is imported by seven client components.
    optimizePackageImports: ["framer-motion"],
  },

  poweredByHeader: false,
};

export default nextConfig;
