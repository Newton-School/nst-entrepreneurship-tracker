import type { Role } from "@/lib/auth";
import { ROLES } from "@/lib/roles";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ROLL_NO_PATTERN = /^20\d{2}-[A-Z]-\d{8}[A-Z]?$/;
export const ROLL_NO_EXAMPLE = "2024-B-16022006A";
export const MIN_PASSWORD_LENGTH = 8;

export type AccountDraft = {
  email: string;
  password: string;
  rollNo: string;
  role: Role;
};

export function accountDraftError(draft: AccountDraft): string | null {
  if (!EMAIL_PATTERN.test(draft.email.trim())) return "Enter a valid email address.";
  if (draft.password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!ROLES.includes(draft.role)) return "Pick a role for this account.";

  const rollNo = draft.rollNo.trim();
  if (draft.role === "student" && !rollNo) return "A student account needs a roll number.";
  if (rollNo && !ROLL_NO_PATTERN.test(rollNo)) return `Roll no. must look like ${ROLL_NO_EXAMPLE}.`;

  return null;
}
