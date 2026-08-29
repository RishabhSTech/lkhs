import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_REGISTRY } from "./icon-registry";

/**
 * The registry exists so that `DynamicIcon` can resolve a database-supplied
 * icon name without pulling all of lucide-react into the bundle. That only
 * holds while the registry actually covers the catalogues — a missing name
 * renders a silent tick, which is easy to ship and hard to notice.
 */
const CATALOGUE_DIR = join(process.cwd(), "src/lib/property");

function catalogueIconNames() {
  const names = new Map<string, string[]>();

  for (const file of readdirSync(CATALOGUE_DIR)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    const source = readFileSync(join(CATALOGUE_DIR, file), "utf8");
    for (const match of source.matchAll(/icon: "([A-Za-z0-9]+)"/g)) {
      const icon = match[1];
      names.set(icon, [...(names.get(icon) ?? []), file]);
    }
  }

  return names;
}

describe("ICON_REGISTRY", () => {
  it("covers every icon named in the property catalogues", () => {
    const used = catalogueIconNames();
    expect(used.size).toBeGreaterThan(0);

    const missing = [...used.entries()]
      .filter(([icon]) => !(icon in ICON_REGISTRY))
      .map(([icon, files]) => `${icon} (${[...new Set(files)].join(", ")})`);

    expect(missing).toEqual([]);
  });

  it("resolves the fallback DynamicIcon uses when a name is unknown", () => {
    expect(ICON_REGISTRY.Check).toBeDefined();
  });

  it("carries no entry that no catalogue asks for", () => {
    const used = catalogueIconNames();
    // `Check` is the fallback and is legitimately unreferenced by a catalogue.
    const unused = Object.keys(ICON_REGISTRY).filter(
      (icon) => icon !== "Check" && !used.has(icon),
    );

    expect(unused).toEqual([]);
  });
});
