import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { hasS3Credentials } from "@/lib/s3.server";

const configure = (over: Record<string, string | undefined> = {}) => {
  const env: Record<string, string | undefined> = {
    AWS_ACCESS_KEY_ID: "AKIAEXAMPLE",
    AWS_SECRET_ACCESS_KEY: "secret",
    AWS_S3_BUCKET: "nst-evidence",
    AWS_REGION: "eu-north-1",
    ...over,
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
};

describe("hasS3Credentials", () => {
  beforeEach(() => {
    configure();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true once the key, secret and bucket are all set", () => {
    expect(hasS3Credentials()).toBe(true);
  });

  it("is false without an access key id", () => {
    configure({ AWS_ACCESS_KEY_ID: undefined });
    expect(hasS3Credentials()).toBe(false);
  });

  it("is false without a secret access key", () => {
    configure({ AWS_SECRET_ACCESS_KEY: undefined });
    expect(hasS3Credentials()).toBe(false);
  });

  it("is false without a bucket", () => {
    configure({ AWS_S3_BUCKET: undefined });
    expect(hasS3Credentials()).toBe(false);
  });

  it("treats an empty string as unset", () => {
    configure({ AWS_S3_BUCKET: "" });
    expect(hasS3Credentials()).toBe(false);
  });

  it("does not require a region, which falls back to a default", () => {
    configure({ AWS_REGION: undefined });
    expect(hasS3Credentials()).toBe(true);
  });

  it("reads the environment on every call rather than caching it", () => {
    expect(hasS3Credentials()).toBe(true);
    configure({ AWS_ACCESS_KEY_ID: undefined });
    expect(hasS3Credentials()).toBe(false);
  });
});
