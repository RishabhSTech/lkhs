import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// `datasource.url` is only required for migrate/introspection commands, not
// `generate` - read it directly (instead of the throwing `env()` helper) so
// `prisma generate` still works in environments (like a Vercel install step)
// where DATABASE_URL isn't wired up yet.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
