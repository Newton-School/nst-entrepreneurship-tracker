import { describe, it, expect } from "vitest";
import {
  accountDraftError,
  MIN_PASSWORD_LENGTH,
  ROLL_NO_EXAMPLE,
  type AccountDraft,
} from "@/lib/account-validation";

const draft = (over: Partial<AccountDraft> = {}): AccountDraft => ({
  email: "asha@nst.edu",
  password: "correct-horse",
  rollNo: ROLL_NO_EXAMPLE,
  role: "student",
  ...over,
});

describe("accountDraftError", () => {
  it("accepts a well-formed student draft", () => {
    expect(accountDraftError(draft())).toBeNull();
  });

  it("rejects an email with no @", () => {
    expect(accountDraftError(draft({ email: "asha.nst.edu" }))).toBe(
      "Enter a valid email address.",
    );
  });

  it("rejects an email with no domain dot", () => {
    expect(accountDraftError(draft({ email: "asha@nst" }))).toBe("Enter a valid email address.");
  });

  it("trims the email before validating it", () => {
    expect(accountDraftError(draft({ email: "  asha@nst.edu  " }))).toBeNull();
  });

  it("rejects a password one character below the minimum", () => {
    const short = "x".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(accountDraftError(draft({ password: short }))).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  });

  it("accepts a password exactly at the minimum", () => {
    expect(accountDraftError(draft({ password: "x".repeat(MIN_PASSWORD_LENGTH) }))).toBeNull();
  });

  it("requires a roll number for a student", () => {
    expect(accountDraftError(draft({ rollNo: "" }))).toBe("A student account needs a roll number.");
  });

  it("lets a non-student account omit the roll number", () => {
    expect(accountDraftError(draft({ role: "mentor", rollNo: "" }))).toBeNull();
  });

  it("still validates a roll number supplied by a non-student", () => {
    expect(accountDraftError(draft({ role: "mentor", rollNo: "not-a-roll-no" }))).toBe(
      `Roll no. must look like ${ROLL_NO_EXAMPLE}.`,
    );
  });

  it("accepts a roll number without the optional trailing letter", () => {
    expect(accountDraftError(draft({ rollNo: "2024-B-16022006" }))).toBeNull();
  });

  it("rejects a roll number with a lowercase branch letter", () => {
    expect(accountDraftError(draft({ rollNo: "2024-b-16022006A" }))).toBe(
      `Roll no. must look like ${ROLL_NO_EXAMPLE}.`,
    );
  });

  it("rejects an unknown role", () => {
    const bad = { ...draft(), role: "superuser" } as unknown as AccountDraft;
    expect(accountDraftError(bad)).toBe("Pick a role for this account.");
  });

  it("reports the email problem first when several fields are invalid", () => {
    expect(accountDraftError(draft({ email: "nope", password: "short", rollNo: "" }))).toBe(
      "Enter a valid email address.",
    );
  });
});
