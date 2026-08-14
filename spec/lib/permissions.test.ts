import { describe, it, expect } from "vitest";
import { canEditKpi, isBoard, type Actor, type KpiContext } from "@/lib/permissions";

const actor = (role: Actor["role"], userId = "user-1"): Actor => ({ userId, role });
const kpi = (over: Partial<KpiContext> = {}): KpiContext => ({
  ventureMentorId: null,
  isLocked: false,
  ...over,
});

describe("canEditKpi", () => {
  it("lets an admin edit a KPI", () => {
    expect(canEditKpi(actor("admin"), kpi())).toBe(true);
  });

  it("lets the academic board edit a KPI", () => {
    expect(canEditKpi(actor("academic_board"), kpi())).toBe(true);
  });

  it("lets a mentor edit a KPI on their own venture", () => {
    const mentor = actor("mentor", "mentor-7");
    expect(canEditKpi(mentor, kpi({ ventureMentorId: "mentor-7" }))).toBe(true);
  });

  it("blocks a mentor from editing a KPI on someone else's venture", () => {
    const mentor = actor("mentor", "mentor-7");
    expect(canEditKpi(mentor, kpi({ ventureMentorId: "mentor-99" }))).toBe(false);
  });

  it("blocks a mentor when the venture has no mentor assigned", () => {
    const mentor = actor("mentor", "mentor-7");
    expect(canEditKpi(mentor, kpi({ ventureMentorId: null }))).toBe(false);
  });

  it("blocks students entirely", () => {
    expect(canEditKpi(actor("student"), kpi())).toBe(false);
  });

  it("blocks a mentor once the KPI is locked", () => {
    const mentor = actor("mentor", "mentor-7");
    expect(canEditKpi(mentor, kpi({ ventureMentorId: "mentor-7", isLocked: true }))).toBe(false);
  });

  it("still lets the board edit a locked KPI", () => {
    expect(canEditKpi(actor("admin"), kpi({ isLocked: true }))).toBe(true);
  });
});

describe("isBoard", () => {
  it("should validate if board", () => {});
});
