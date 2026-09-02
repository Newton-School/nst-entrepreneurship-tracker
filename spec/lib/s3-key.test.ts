import { describe, it, expect } from "vitest";
import { buildSubmissionS3Key } from "@/lib/s3.server";

const VENTURE = "venture-123";
const SUBMISSION = "sub-456";

const key = (filename: string) => buildSubmissionS3Key(VENTURE, SUBMISSION, filename);

describe("buildSubmissionS3Key", () => {
  it("nests the file under its venture and submission", () => {
    expect(key("pitch.pdf")).toBe("ventures/venture-123/submissions/sub-456/pitch.pdf");
  });

  it("keeps letters, digits, dots, underscores and hyphens as they are", () => {
    expect(key("Week_3-Pitch.v2.pdf")).toMatch(/\/Week_3-Pitch\.v2\.pdf$/);
  });

  it("replaces spaces so the key needs no escaping", () => {
    expect(key("customer validation.zip")).toMatch(/\/customer_validation\.zip$/);
  });

  it("neutralises a path traversal attempt", () => {
    const result = key("../../secrets.env");
    expect(result).toBe("ventures/venture-123/submissions/sub-456/.._.._secrets.env");
    expect(result).not.toContain("../");
  });

  it("neutralises an absolute path", () => {
    const result = key("/etc/passwd");
    expect(result).toBe("ventures/venture-123/submissions/sub-456/_etc_passwd");
  });

  it("keeps every submission on its own prefix", () => {
    expect(buildSubmissionS3Key(VENTURE, "sub-A", "f.pdf")).not.toBe(
      buildSubmissionS3Key(VENTURE, "sub-B", "f.pdf"),
    );
  });

  it("replaces non-ascii characters rather than dropping them", () => {
    expect(key("réponse.pdf")).toMatch(/\/r_ponse\.pdf$/);
  });

  it("does not collapse runs of unsafe characters", () => {
    // One replacement per character, so two distinct uploads cannot collide on one key.
    expect(key("a  b.pdf")).toMatch(/\/a__b\.pdf$/);
  });
});
