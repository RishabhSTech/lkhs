import { describe, expect, it } from "vitest";
import { getManageableUserRoles, isManageableRole, normalizeUserInput } from "./user-management";

describe("user-management permissions", () => {
  it("only exposes staff roles for backend user management", () => {
    expect(getManageableUserRoles()).toEqual([
      "SUPER_ADMIN",
      "ADMIN",
      "MANAGER",
      "FINANCE",
      "OPERATIONS",
      "CLEANER",
      "MARKETING",
    ]);
  });

  it("normalizes and rejects non-team roles for backend creation", () => {
    expect(isManageableRole("SUPER_ADMIN")).toBe(true);
    expect(isManageableRole("GUEST")).toBe(false);
    expect(isManageableRole("OWNER")).toBe(false);

    const result = normalizeUserInput({
      name: "  Ava Singh  ",
      email: " ava@example.com ",
      phone: " 9876543210 ",
      role: "ADMIN",
    });

    expect(result).toEqual({
      name: "Ava Singh",
      email: "ava@example.com",
      phone: "9876543210",
      role: "ADMIN",
    });
  });
});
