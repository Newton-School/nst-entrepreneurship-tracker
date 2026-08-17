import type { Role } from "@/lib/auth";

export type Actor = { userId: string; role: Role };

export type KpiContext = {
  ventureMentorId: string | null;
  isLocked: boolean;
};

const isBoard = (a: Actor) => a.role === "admin" || a.role === "academic_board";

const isMentorOf = (a: Actor, ventureMentorId: string | null) =>
  a.role === "mentor" && ventureMentorId !== null && ventureMentorId === a.userId;

export function canAddKpi(a: Actor, ventureMentorId: string | null): boolean {
  return isBoard(a) || isMentorOf(a, ventureMentorId);
}

export function canEditKpi(a: Actor, ctx: KpiContext): boolean {
  return isBoard(a) || (isMentorOf(a, ctx.ventureMentorId) && !ctx.isLocked);
}

export function canLockKpi(a: Actor, ctx: KpiContext): boolean {
  return !ctx.isLocked && (isBoard(a) || isMentorOf(a, ctx.ventureMentorId));
}

export function canUnlockKpi(a: Actor, ctx: KpiContext): boolean {
  return ctx.isLocked && isBoard(a);
}

export function canManageVentures(a: Actor): boolean {
  return isBoard(a);
}

export function canManageRoles(a: Actor): boolean {
  return a.role === "admin";
}

export function canChangeRoleOf(a: Actor, targetUserId: string): boolean {
  return canManageRoles(a) && a.userId !== targetUserId;
}

export function canCreateAccounts(a: Actor): boolean {
  return canManageRoles(a);
}

export function canDeleteAccountOf(a: Actor, targetUserId: string): boolean {
  return canManageRoles(a) && a.userId !== targetUserId;
}

export function canReviewProposal(a: Actor): boolean {
  return a.role !== "student";
}

export function resolveMentorForAccept(a: Actor, pickedMentorId: string | null): string | null {
  return a.role === "mentor" ? a.userId : pickedMentorId;
}

export function mustPickMentorToAccept(a: Actor): boolean {
  return isBoard(a);
}

export { isBoard, isMentorOf };
