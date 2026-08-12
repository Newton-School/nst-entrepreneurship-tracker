import type { Role } from "@/lib/auth";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  academic_board: "Academic Board",
  mentor: "Mentor",
  student: "Student",
};

export const ROLES: Role[] = ["admin", "academic_board", "mentor", "student"];
