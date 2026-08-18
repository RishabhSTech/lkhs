import type { PoolConfig } from "pg";

/**
 * Supabase's pooler presents a cert chain Node won't verify against the system
 * store. Point PGSSLROOTCERT at Supabase's CA bundle for full verification;
 * without it we still use TLS but skip chain validation.
 *
 * Note: DATABASE_URL must not carry an `sslmode` param — pg lets it win over
 * this config, which reintroduces the verification failure.
 */
export function pgPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Escape hatch for a plain local/CI Postgres (docker-compose service
  // containers, GitHub Actions' postgres: service) that doesn't speak TLS at
  // all — forcing the ssl option against one fails the handshake outright.
  // Never set this against Supabase or any other TLS-only host.
  if (process.env.PGSSL_DISABLE === "true") {
    return { connectionString };
  }

  const caPath = process.env.PGSSLROOTCERT;
  if (caPath) {
    // Lazy require so bundlers don't pull fs into edge/client builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    return { connectionString, ssl: { ca: readFileSync(caPath, "utf8") } };
  }

  return { connectionString, ssl: { rejectUnauthorized: false } };
}
