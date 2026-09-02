import { describe, it, expect } from "vitest";
import {
  canAddKpi,
  canChangeRoleOf,
  canCreateAccounts,
  canDeleteAccountOf,
  canEditKpi,
  canLockKpi,
  canManageRoles,
  canManageVentures,
  canReviewProposal,
  canUnlockKpi,
  isBoard,
  isMentorOf,
  mustPickMentorToAccept,
  resolveMentorForAccept,
  type Actor,
  type KpiContext,
} from "@/lib/permissions";

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
  it("counts an admin as board", () => {
    expect(isBoard(actor("admin"))).toBe(true);
  });

  it("counts the academic board as board", () => {
    expect(isBoard(actor("academic_board"))).toBe(true);
  });

  it("does not count a mentor as board", () => {
    expect(isBoard(actor("mentor"))).toBe(false);
  });

  it("does not count a student as board", () => {
    expect(isBoard(actor("student"))).toBe(false);
  });
});

describe("isMentorOf", () => {
  it("matches a mentor against their own venture", () => {
    expect(isMentorOf(actor("mentor", "mentor-7"), "mentor-7")).toBe(true);
  });

  it("rejects a mentor on someone else's venture", () => {
    expect(isMentorOf(actor("mentor", "mentor-7"), "mentor-99")).toBe(false);
  });

  it("rejects a venture with no mentor assigned", () => {
    expect(isMentorOf(actor("mentor", "mentor-7"), null)).toBe(false);
  });

  it("rejects an admin whose id happens to match the mentor id", () => {
    expect(isMentorOf(actor("admin", "mentor-7"), "mentor-7")).toBe(false);
  });
});

describe("canAddKpi", () => {
  it("lets an admin add a KPI", () => {
    expect(canAddKpi(actor("admin"), "student-1", "mentor-7")).toBe(true);
  });

  it("lets the academic board add a KPI", () => {
    expect(canAddKpi(actor("academic_board"), "student-1", "mentor-7")).toBe(true);
  });

  it("lets a student add a KPI", () => {
    expect(canAddKpi(actor("student"), "student-1", "mentor-7")).toBe(true);
  });

  it("blocks a mentor from adding a KPI to their own venture", () => {
    expect(canAddKpi(actor("mentor", "mentor-7"), "student-1", "mentor-7")).toBe(false);
  });

  it("lets a student add a KPI to a venture that is not theirs", () => {
    expect(canAddKpi(actor("student", "student-2"), "student-1", "mentor-7")).toBe(true);
  });
});

describe("canLockKpi", () => {
  it("lets the board lock an unlocked KPI", () => {
    expect(canLockKpi(actor("admin"), kpi())).toBe(true);
  });

  it("lets a mentor lock a KPI on their own venture", () => {
    expect(canLockKpi(actor("mentor", "mentor-7"), kpi({ ventureMentorId: "mentor-7" }))).toBe(
      true,
    );
  });

  it("blocks a mentor from locking a KPI on someone else's venture", () => {
    expect(canLockKpi(actor("mentor", "mentor-7"), kpi({ ventureMentorId: "mentor-99" }))).toBe(
      false,
    );
  });

  it("blocks a student from locking a KPI", () => {
    expect(canLockKpi(actor("student"), kpi())).toBe(false);
  });

  it("refuses to lock a KPI that is already locked", () => {
    expect(canLockKpi(actor("admin"), kpi({ isLocked: true }))).toBe(false);
  });
});

describe("canUnlockKpi", () => {
  it("lets the board unlock a locked KPI", () => {
    expect(canUnlockKpi(actor("admin"), kpi({ isLocked: true }))).toBe(true);
    expect(canUnlockKpi(actor("academic_board"), kpi({ isLocked: true }))).toBe(true);
  });

  it("blocks the mentor who locked it from unlocking it", () => {
    expect(
      canUnlockKpi(
        actor("mentor", "mentor-7"),
        kpi({ ventureMentorId: "mentor-7", isLocked: true }),
      ),
    ).toBe(false);
  });

  it("blocks a student from unlocking a KPI", () => {
    expect(canUnlockKpi(actor("student"), kpi({ isLocked: true }))).toBe(false);
  });

  it("is a no-op on a KPI that is not locked", () => {
    expect(canUnlockKpi(actor("admin"), kpi())).toBe(false);
  });
});

describe("canManageVentures", () => {
  it("lets the board manage ventures", () => {
    expect(canManageVentures(actor("admin"))).toBe(true);
    expect(canManageVentures(actor("academic_board"))).toBe(true);
  });

  it("blocks mentors and students", () => {
    expect(canManageVentures(actor("mentor"))).toBe(false);
    expect(canManageVentures(actor("student"))).toBe(false);
  });
});

describe("canManageRoles", () => {
  it("lets an admin manage roles", () => {
    expect(canManageRoles(actor("admin"))).toBe(true);
  });

  it("blocks the academic board, unlike the other board powers", () => {
    expect(canManageRoles(actor("academic_board"))).toBe(false);
  });

  it("blocks mentors and students", () => {
    expect(canManageRoles(actor("mentor"))).toBe(false);
    expect(canManageRoles(actor("student"))).toBe(false);
  });
});

describe("canChangeRoleOf", () => {
  it("lets an admin change someone else's role", () => {
    expect(canChangeRoleOf(actor("admin", "admin-1"), "user-2")).toBe(true);
  });

  it("stops an admin from changing their own role", () => {
    expect(canChangeRoleOf(actor("admin", "admin-1"), "admin-1")).toBe(false);
  });

  it("blocks the academic board from changing anyone's role", () => {
    expect(canChangeRoleOf(actor("academic_board", "board-1"), "user-2")).toBe(false);
  });

  it("blocks a student from changing their own role", () => {
    expect(canChangeRoleOf(actor("student", "student-1"), "student-1")).toBe(false);
  });
});

describe("canCreateAccounts", () => {
  it("lets an admin create accounts", () => {
    expect(canCreateAccounts(actor("admin"))).toBe(true);
  });

  it("blocks everyone else", () => {
    expect(canCreateAccounts(actor("academic_board"))).toBe(false);
    expect(canCreateAccounts(actor("mentor"))).toBe(false);
    expect(canCreateAccounts(actor("student"))).toBe(false);
  });
});

describe("canDeleteAccountOf", () => {
  it("lets an admin delete another account", () => {
    expect(canDeleteAccountOf(actor("admin", "admin-1"), "user-2")).toBe(true);
  });

  it("stops an admin from deleting their own account", () => {
    expect(canDeleteAccountOf(actor("admin", "admin-1"), "admin-1")).toBe(false);
  });

  it("blocks a mentor from deleting an account", () => {
    expect(canDeleteAccountOf(actor("mentor", "mentor-7"), "user-2")).toBe(false);
  });
});

describe("canReviewProposal", () => {
  it("lets the board review a proposal", () => {
    expect(canReviewProposal(actor("admin"))).toBe(true);
    expect(canReviewProposal(actor("academic_board"))).toBe(true);
  });

  it("lets a mentor review a proposal", () => {
    expect(canReviewProposal(actor("mentor"))).toBe(true);
  });

  it("blocks a student from reviewing a proposal", () => {
    expect(canReviewProposal(actor("student"))).toBe(false);
  });
});

describe("resolveMentorForAccept", () => {
  it("assigns a mentor to themselves and ignores the picked mentor", () => {
    expect(resolveMentorForAccept(actor("mentor", "mentor-7"), "mentor-99")).toBe("mentor-7");
  });

  it("assigns a mentor to themselves when nothing was picked", () => {
    expect(resolveMentorForAccept(actor("mentor", "mentor-7"), null)).toBe("mentor-7");
  });

  it("keeps the mentor the board picked", () => {
    expect(resolveMentorForAccept(actor("admin", "admin-1"), "mentor-7")).toBe("mentor-7");
  });

  it("leaves the venture unassigned when the board picked nobody", () => {
    expect(resolveMentorForAccept(actor("admin", "admin-1"), null)).toBeNull();
  });
});

describe("mustPickMentorToAccept", () => {
  it("makes the board pick a mentor", () => {
    expect(mustPickMentorToAccept(actor("admin"))).toBe(true);
    expect(mustPickMentorToAccept(actor("academic_board"))).toBe(true);
  });

  it("does not ask a mentor to pick one", () => {
    expect(mustPickMentorToAccept(actor("mentor"))).toBe(false);
  });
});
