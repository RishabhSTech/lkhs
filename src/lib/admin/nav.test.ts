import { describe, expect, it } from "vitest";
import { visibleNavFor } from "./nav";

const hrefs = (role: Parameters<typeof visibleNavFor>[0], scoped = false) =>
  visibleNavFor(role, scoped).map((i) => i.href);

describe("visibleNavFor", () => {
  it("gives cleaners only their tasks and expenses", () => {
    expect(hrefs("CLEANER")).toEqual(["/admin/finance/expenses", "/admin/operations"]);
  });

  it("hides finance, pricing and settings from marketing", () => {
    const nav = hrefs("MARKETING");
    expect(nav).not.toContain("/admin/finance");
    expect(nav).not.toContain("/admin/pricing");
    expect(nav).not.toContain("/admin/settings");
    expect(nav).toContain("/admin/reviews");
  });

  it("drops portfolio-wide screens for property-scoped staff", () => {
    const nav = hrefs("MANAGER", true);
    for (const href of ["/admin", "/admin/guests", "/admin/analytics", "/admin/pricing", "/admin/messages"]) {
      expect(nav).not.toContain(href);
    }
    expect(nav).toEqual(
      expect.arrayContaining(["/admin/reservations", "/admin/calendar", "/admin/operations", "/admin/finance/expenses"]),
    );
  });

  it("sends scoped finance staff to expenses instead of the P&L", () => {
    const nav = hrefs("FINANCE", true);
    expect(nav).toContain("/admin/finance/expenses");
    expect(nav).not.toContain("/admin/finance");
  });
});
