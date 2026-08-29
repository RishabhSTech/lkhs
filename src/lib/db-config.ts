import type { PoolConfig } from "pg";

/**
 * Supabase's pooler presents a cert chain Node won't verify against the system
 * store. Point PGSSLROOTCERT at Supabase's CA bundle for full verification;
 * without it we still use TLS but skip chain validation.
 *
 * Note: DATABASE_URL must not carry an `sslmode` param — pg lets it win over
 * this config, which reintroduces the verification failure.
 */
/**
 * Connections this process may hold open.
 *
 * This matters most during `next build`: prerendering runs in several worker
 * processes, each constructing its own `PrismaClient` and therefore its own
 * pool. `pg` defaults to 10 per pool, so a handful of workers is enough to
 * exhaust Supabase's session-mode pooler (15 clients) and fail the build with
 * `EMAXCONNSESSION`. The build script sets this low; serving keeps the default.
 */
function poolMax(): number {
  const raw = Number(process.env.PG_POOL_MAX);
  return Number.isFinite(raw) && raw > 0 ? raw : 10;
}

export function pgPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const max = poolMax();

  // Escape hatch for a plain local/CI Postgres (docker-compose service
  // containers, GitHub Actions' postgres: service) that doesn't speak TLS at
  // all — forcing the ssl option against one fails the handshake outright.
  // Never set this against Supabase or any other TLS-only host.
  if (process.env.PGSSL_DISABLE === "true") {
    return { connectionString, max };
  }

  const caPath = process.env.PGSSLROOTCERT;
  if (caPath) {
    // Lazy require so bundlers don't pull fs into edge/client builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("node:fs") as typeof import("node:fs");
    return { connectionString, max, ssl: { ca: readFileSync(caPath, "utf8") } };
  }

  return { connectionString, max, ssl: { rejectUnauthorized: false } };
}
