import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// `datasource.url` is only required for migrate/introspection commands, not
// `generate` - read it directly (instead of the throwing `env()` helper) so
// `prisma generate` still works in environments (like a Vercel install step)
// where these vars aren't wired up yet.
//
// This intentionally uses DIRECT_URL, not DATABASE_URL: the app's runtime
// connection (src/lib/db.ts) is Supavisor's transaction-mode pooler, which
// doesn't hold a stable session - `prisma migrate`'s advisory locks and DDL
// need the session-mode connection instead.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
