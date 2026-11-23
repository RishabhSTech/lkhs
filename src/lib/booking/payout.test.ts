import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { finalPayout } from "./payout";

describe("finalPayout", () => {
  it("takes platform fee, host tax and other charges off the total", () => {
    expect(finalPayout({ total: 10_000, platformFee: 1_500, hostTax: 270, otherCharges: 30 })).toBe(8_200);
  });

  it("accepts Prisma decimals", () => {
    const d = (n: string) => new Prisma.Decimal(n);
    expect(finalPayout({ total: d("3540.25"), platformFee: d("0"), hostTax: d("0"), otherCharges: d("0") })).toBe(3540.25);
  });
});
