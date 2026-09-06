import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // The real package throws if imported outside Next's server bundler -
      // a no-op here is correct for tests, since Vitest never bundles for a
      // browser client in the first place.
      "server-only": new URL("./vitest.server-only-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // The booking integration test hits a real (often remote) Postgres
    // instance for several sequential round trips per reservation - the 5s
    // default is too tight for that over a non-local connection.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
