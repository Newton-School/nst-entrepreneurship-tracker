import { describe, it, expect } from "vitest";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

describe("ROLES", () => {
  it("lists the four roles the app knows about", () => {
    expect(ROLES).toEqual(["admin", "academic_board", "mentor", "student"]);
  });

  it("holds no duplicates", () => {
    expect(new Set(ROLES).size).toBe(ROLES.length);
  });
});

describe("ROLE_LABELS", () => {
  it("labels every role in ROLES", () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it("labels nothing that is not a role", () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([...ROLES].sort());
  });

  it("gives each role a distinct label", () => {
    const labels = Object.values(ROLE_LABELS);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("spells the academic board out rather than showing the raw enum", () => {
    expect(ROLE_LABELS.academic_board).toBe("Academic Board");
  });
});
