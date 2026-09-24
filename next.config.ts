import type { NextConfig } from "next";

type RemotePattern = { protocol: "http" | "https"; hostname: string; port?: string };

/** next/image refuses to render from a host that isn't explicitly
 * whitelisted, so whichever S3-compatible host object storage is actually
 * configured against (MinIO, Supabase Storage, or anything else - see
 * src/lib/storage/s3.ts) needs to be derived from the same env vars rather
 * than hardcoded, or photos silently fail to load whenever the provider
 * changes. */
function storageHostPattern(url: string | undefined): RemotePattern | null {
  if (!url) return null;
  try {
    const { protocol, hostname, port } = new URL(url);
    return { protocol: protocol === "https:" ? "https" : "http", hostname, ...(port ? { port } : {}) };
  } catch {
    return null;
  }
}

const storagePatterns = [
  storageHostPattern(process.env.S3_PUBLIC_URL_BASE),
  storageHostPattern(process.env.S3_PUBLIC_ENDPOINT),
  storageHostPattern(process.env.S3_ENDPOINT),
].filter((pattern, index, all): pattern is RemotePattern => {
  if (!pattern) return false;
  return all.findIndex((p) => p?.hostname === pattern.hostname && p?.protocol === pattern.protocol) === index;
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" },
      ...storagePatterns,
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
