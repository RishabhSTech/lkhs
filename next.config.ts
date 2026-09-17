import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400, // 31 days
    qualities: [75],
  },

  experimental: {
    cpus: 4,
    staticGenerationMinPagesPerWorker: 25,

    inlineCss: true,
    // `lucide-react`, `date-fns` and `recharts` are optimised by Next already;
    // `framer-motion` is not, and it is imported by seven client components.
    optimizePackageImports: ["framer-motion"],
  },

  poweredByHeader: false,
};

export default nextConfig;
