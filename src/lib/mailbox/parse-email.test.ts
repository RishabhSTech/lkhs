import { describe, expect, it } from "vitest";
import { buildImapSearchQuery, sourceFromAddress } from "./parse-email";

describe("sourceFromAddress", () => {
  it("maps known OTA sender domains to their BookingSource", () => {
    expect(sourceFromAddress("automated@airbnb.com")).toBe("AIRBNB");
    expect(sourceFromAddress("noreply@mail.airbnb.com")).toBe("AIRBNB");
    expect(sourceFromAddress("noreply@booking.com")).toBe("BOOKING_COM");
    expect(sourceFromAddress("guest@message.booking.com")).toBe("BOOKING_COM");
    expect(sourceFromAddress("noreply@agoda.com")).toBe("AGODA");
  });

  it("never guesses a source for an unrecognized domain", () => {
    expect(sourceFromAddress("someone@notanota.example.com")).toBeNull();
    expect(sourceFromAddress("phishing@airbnb.com.evil.com")).toBeNull();
  });

  it("handles an address with no @ at all", () => {
    expect(sourceFromAddress("not an email at all")).toBeNull();
  });
});

describe("buildImapSearchQuery", () => {
  it("includes a since date and an OR of every known OTA domain", () => {
    const since = new Date("2032-01-01");
    const query = buildImapSearchQuery(since);
    expect(query.since).toBe(since);
    expect(query.or?.map((c) => c.from)).toEqual(
      expect.arrayContaining(["airbnb.com", "booking.com", "agoda.com"]),
    );
  });
});
