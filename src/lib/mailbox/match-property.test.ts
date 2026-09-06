import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { matchPropertyByHint } from "./match-property";

/**
 * Runs against the real database (see create-reservation.test.ts for why) —
 * the matching logic queries live Property rows, and the interesting
 * behavior here is entirely about how it scores real names against each
 * other, not something worth mocking out.
 */
describe("matchPropertyByHint", () => {
  const marker = `vitest-match-prop-${Date.now()}`;
  let clearMatchId: string;

  beforeAll(async () => {
    const base = {
      description: "Fixture property for match-property tests.",
      locationArea: "Test Area",
      addressLine: "1 Test Lane",
      maxGuests: 2,
      bedrooms: 1,
      bathrooms: 1,
      beds: 1,
      basePrice: 2000,
    };
    const clear = await db.property.create({
      data: { ...base, slug: `${marker}-gather-villa`, name: `${marker} The Gather Villa` },
    });
    clearMatchId = clear.id;
    // Two similarly-named properties so a generic hint can't cleanly pick one.
    await db.property.create({ data: { ...base, slug: `${marker}-lake-house-1`, name: `${marker} Lake House One` } });
    await db.property.create({ data: { ...base, slug: `${marker}-lake-house-2`, name: `${marker} Lake House Two` } });
  });

  afterAll(async () => {
    await db.property.deleteMany({ where: { slug: { startsWith: marker } } });
  });

  it("returns the clear match when the hint closely names one property", async () => {
    const result = await matchPropertyByHint(`${marker} The Gather Villa - Entire villa`);
    expect(result?.propertyId).toBe(clearMatchId);
  });

  it("returns null when two properties score too close to call", async () => {
    const result = await matchPropertyByHint(`${marker} Lake House`);
    expect(result).toBeNull();
  });

  it("returns null when nothing matches", async () => {
    const result = await matchPropertyByHint("Completely Unrelated Listing Name 12345");
    expect(result).toBeNull();
  });

  it("returns null for an empty hint", async () => {
    expect(await matchPropertyByHint("   ")).toBeNull();
  });
});
