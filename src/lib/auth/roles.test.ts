import { describe, expect, it } from "vitest";
import { cleanerMayAccess } from "./roles";

describe("cleanerMayAccess", () => {
  it("allows a cleaner's task list, expenses and the APIs behind them", () => {
    for (const path of [
      "/admin",
      "/admin/operations",
      "/admin/finance/expenses",
      "/admin/finance/expenses/new",
      "/api/admin/operations/cleaning",
      "/api/admin/expenses/abc123",
      "/api/admin/uploads",
      "/api/admin/operations/maintenance",
    ]) {
      expect(cleanerMayAccess(path), path).toBe(true);
    }
  });

  it("keeps cleaners out of finance, bookings and settings", () => {
    for (const path of [
      "/admin/finance",
      "/admin/finance/revenue",
      "/admin/reservations",
      "/admin/settings",
      "/admin/operationsX",
      "/api/admin/reservations",
      "/api/admin/operations/team",
      "/api/admin/users",
    ]) {
      expect(cleanerMayAccess(path), path).toBe(false);
    }
  });
});
