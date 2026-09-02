import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins plain class names", () => {
    expect(cn("rounded", "border")).toBe("rounded border");
  });

  it("lets a later tailwind class win over an earlier one in the same group", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("keeps classes from different groups side by side", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("drops falsy values", () => {
    expect(cn("rounded", false, null, undefined, "")).toBe("rounded");
  });

  it("accepts arrays", () => {
    expect(cn(["rounded", "border"])).toBe("rounded border");
  });

  it("accepts an object of conditional classes", () => {
    expect(cn({ rounded: true, border: false })).toBe("rounded");
  });

  it("resolves a conditional override against a base class", () => {
    expect(cn("text-sm text-gray-500", { "text-red-500": true })).toBe("text-sm text-red-500");
  });

  it("returns an empty string when given nothing", () => {
    expect(cn()).toBe("");
  });
});
