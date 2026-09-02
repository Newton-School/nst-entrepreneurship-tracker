import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  uploadToS3: vi.fn(),
  deleteFromS3: vi.fn(),
  getSignedDownloadUrl: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

vi.mock("@/lib/s3.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/s3.server")>();
  return {
    ...actual,
    uploadToS3: mocks.uploadToS3,
    deleteFromS3: mocks.deleteFromS3,
    getSignedDownloadUrl: mocks.getSignedDownloadUrl,
  };
});

import {
  processUploadSubmission,
  processDownloadSubmission,
} from "@/lib/submission-handler.server";

type QueryResult = { data?: unknown; error?: unknown };
type TableFixture = { select?: QueryResult; insert?: QueryResult; delete?: QueryResult };
type Recorder = {
  inserted: Record<string, unknown>[];
  rowDeletes: number;
  filters: [string, unknown][];
};

function fakeSupabase(
  tables: Record<string, TableFixture>,
  user: { id: string } | null = { id: "auth-user" },
) {
  const recorder: Recorder = { inserted: [], rowDeletes: 0, filters: [] };

  const queryOn = (fixture: TableFixture) => {
    let op: keyof TableFixture = "select";
    const settle = (): QueryResult => fixture[op] ?? { data: null, error: null };
    const chain = {
      select: () => chain,
      insert: (row: Record<string, unknown>) => {
        op = "insert";
        recorder.inserted.push(row);
        return chain;
      },
      delete: () => {
        op = "delete";
        recorder.rowDeletes += 1;
        return chain;
      },
      eq: (column: string, value: unknown) => {
        recorder.filters.push([column, value]);
        return chain;
      },
      single: async () => settle(),
      maybeSingle: async () => settle(),
      then: <T>(onFulfilled: (value: QueryResult) => T) =>
        Promise.resolve(settle()).then(onFulfilled),
    };
    return chain;
  };

  const client = {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: (name: string) => queryOn(tables[name] ?? {}),
  };

  mocks.createClient.mockReturnValue(client);
  return recorder;
}

const kpiRow = (over: Record<string, unknown> = {}) => ({
  id: "kpi-1",
  venture_id: "venture-1",
  is_locked: false,
  due_date: null,
  score: null,
  ...over,
});

const submissionRow = (over: Record<string, unknown> = {}) => ({
  id: "sub-1",
  file_name: "old.pdf",
  storage_path: "ventures/venture-1/submissions/sub-1/old.pdf",
  size_bytes: 10,
  mime_type: "application/pdf",
  ...over,
});

const wire = (
  over: {
    kpi?: QueryResult;
    existing?: QueryResult;
    insert?: QueryResult;
    rowDelete?: QueryResult;
    user?: { id: string } | null;
  } = {},
) =>
  fakeSupabase(
    {
      venture_kpis: { select: over.kpi ?? { data: kpiRow() } },
      kpi_submissions: {
        select: over.existing ?? { data: null },
        insert: over.insert ?? { data: { id: "sub-1" } },
        delete: over.rowDelete ?? { error: null },
      },
    },
    over.user === undefined ? { id: "auth-user" } : over.user,
  );

const upload = (over: Partial<Parameters<typeof processUploadSubmission>[0]> = {}) =>
  processUploadSubmission({
    kpiId: "kpi-1",
    ventureId: "venture-1",
    note: "",
    fileBuffer: new Uint8Array([1, 2, 3]),
    fileName: "pitch.pdf",
    mimeType: "application/pdf",
    authHeader: "Bearer token-1",
    ...over,
  });

const download = (over: Partial<Parameters<typeof processDownloadSubmission>[0]> = {}) =>
  processDownloadSubmission({ kpiId: "kpi-1", authHeader: "Bearer token-1", ...over });

const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("VITE_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  mocks.uploadToS3.mockResolvedValue(undefined);
  mocks.deleteFromS3.mockResolvedValue(undefined);
  mocks.getSignedDownloadUrl.mockResolvedValue("https://s3.example/signed");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const unsetSupabaseEnv = () => {
  for (const key of [
    "SUPABASE_URL",
    "VITE_SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]) {
    vi.stubEnv(key, undefined);
  }
};

describe("processUploadSubmission", () => {
  it("refuses a request with no kpiId", async () => {
    wire();
    await expect(upload({ kpiId: "" })).rejects.toThrow("Missing required kpiId or ventureId.");
  });

  it("refuses a request with no ventureId", async () => {
    wire();
    await expect(upload({ ventureId: "" })).rejects.toThrow("Missing required kpiId or ventureId.");
  });

  it("refuses a note longer than 1000 characters", async () => {
    wire();
    await expect(upload({ note: "x".repeat(1001) })).rejects.toThrow(
      "Supporting explanation exceeds maximum limit of 1000 characters.",
    );
  });

  it("accepts a note of exactly 1000 characters", async () => {
    wire();
    await expect(upload({ note: "x".repeat(1000) })).resolves.toMatchObject({ success: true });
  });

  it("refuses to run when the server has no Supabase configuration", async () => {
    unsetSupabaseEnv();
    wire();
    await expect(upload()).rejects.toThrow("Server database configuration is missing.");
  });

  it("refuses a request with no authorization header", async () => {
    wire();
    await expect(upload({ authHeader: undefined })).rejects.toThrow(
      "You must be signed in to submit evidence.",
    );
  });

  it("refuses an authorization header with nothing after Bearer", async () => {
    wire();
    await expect(upload({ authHeader: "Bearer " })).rejects.toThrow(
      "You must be signed in to submit evidence.",
    );
  });

  it("reports the code and message when the KPI lookup fails", async () => {
    wire({ kpi: { data: null, error: { code: "PGRST301", message: "JWT expired" } } });
    await expect(upload()).rejects.toThrow("Target KPI record not found (PGRST301: JWT expired).");
  });

  it("reports a KPI that simply is not there", async () => {
    wire({ kpi: { data: null, error: null } });
    await expect(upload()).rejects.toThrow("Target KPI record not found.");
  });

  it("refuses to write to a locked KPI", async () => {
    wire({ kpi: { data: kpiRow({ is_locked: true }) } });
    await expect(upload()).rejects.toThrow("Submission is locked or scored. Editing is disabled.");
  });

  it("refuses to write to a KPI that is already scored", async () => {
    wire({ kpi: { data: kpiRow({ score: 7 }) } });
    await expect(upload()).rejects.toThrow("Submission is locked or scored. Editing is disabled.");
  });

  it("refuses to write to a KPI scored zero", async () => {
    wire({ kpi: { data: kpiRow({ score: 0 }) } });
    await expect(upload()).rejects.toThrow("Submission is locked or scored. Editing is disabled.");
  });

  it("accepts a submission made after the due date", async () => {
    wire({ kpi: { data: kpiRow({ due_date: inMinutes(-1) }) } });
    await expect(upload()).resolves.toMatchObject({ success: true });
  });

  it("flags a submission made after the due date as late", async () => {
    const recorder = wire({ kpi: { data: kpiRow({ due_date: inMinutes(-1) }) } });
    await upload();
    expect(recorder.inserted[0].is_late).toBe(true);
  });

  it("leaves a submission made before the due date unflagged", async () => {
    const recorder = wire({ kpi: { data: kpiRow({ due_date: inMinutes(60) }) } });
    await upload();
    expect(recorder.inserted[0].is_late).toBe(false);
  });

  it("leaves a submission unflagged when the due date cannot be parsed", async () => {
    const recorder = wire({ kpi: { data: kpiRow({ due_date: "not-a-date" }) } });
    await expect(upload()).resolves.toMatchObject({ success: true });
    expect(recorder.inserted[0].is_late).toBe(false);
  });

  it("still refuses a late submission once the KPI is locked", async () => {
    wire({ kpi: { data: kpiRow({ due_date: inMinutes(-1), is_locked: true }) } });
    await expect(upload()).rejects.toThrow("Submission is locked or scored. Editing is disabled.");
  });

  it("refuses a file over the 10 MB limit", async () => {
    wire();
    const tooBig = new Uint8Array(10 * 1024 * 1024 + 1);
    await expect(upload({ fileBuffer: tooBig })).rejects.toThrow(
      "File exceeds 10 MB maximum limit",
    );
    expect(mocks.uploadToS3).not.toHaveBeenCalled();
  });

  it("accepts a file of exactly 10 MB", async () => {
    wire();
    const atLimit = new Uint8Array(10 * 1024 * 1024);
    await expect(upload({ fileBuffer: atLimit })).resolves.toMatchObject({ success: true });
  });

  it("refuses an executable disguised as evidence", async () => {
    wire();
    await expect(upload({ fileName: "payload.exe" })).rejects.toThrow(
      "File format '.exe' is unsupported. Please upload a Document or ZIP file.",
    );
    expect(mocks.uploadToS3).not.toHaveBeenCalled();
  });

  it("refuses a file with no extension at all", async () => {
    wire();
    await expect(upload({ fileName: "evidence" })).rejects.toThrow("is unsupported");
  });

  it("accepts an archive", async () => {
    wire();
    await expect(upload({ fileName: "evidence.zip" })).resolves.toMatchObject({ success: true });
  });

  it("matches the extension whatever its casing", async () => {
    wire();
    await expect(upload({ fileName: "PITCH.PDF" })).resolves.toMatchObject({ success: true });
  });

  it("requires a file when there is no previous submission", async () => {
    wire();
    await expect(upload({ fileBuffer: null, fileName: "" })).rejects.toThrow(
      "Please select an evidence file to upload.",
    );
  });

  it("keeps the previous file when the student only edits the note", async () => {
    const recorder = wire({ existing: { data: submissionRow() } });
    await upload({ fileBuffer: null, fileName: "", note: "revised note" });
    expect(mocks.uploadToS3).not.toHaveBeenCalled();
    expect(recorder.inserted[0]).toMatchObject({
      file_name: "old.pdf",
      storage_path: "ventures/venture-1/submissions/sub-1/old.pdf",
      note: "revised note",
    });
  });

  it("stores a first upload under its venture and a fresh submission id", async () => {
    const recorder = wire();
    await upload();
    const key = mocks.uploadToS3.mock.calls[0][0].key as string;
    expect(key).toMatch(/^ventures\/venture-1\/submissions\/[0-9a-f-]{36}\/pitch\.pdf$/);
    expect(recorder.inserted[0].storage_path).toBe(key);
  });

  it("passes the file and its content type through to S3", async () => {
    wire();
    const bytes = new Uint8Array([9, 9, 9]);
    await upload({ fileBuffer: bytes, mimeType: "application/pdf" });
    expect(mocks.uploadToS3).toHaveBeenCalledWith(
      expect.objectContaining({ body: bytes, contentType: "application/pdf" }),
    );
  });

  it("deletes the previous object once the new one is uploaded under a different key", async () => {
    wire({ existing: { data: submissionRow() } });
    await upload({ fileName: "revised.pdf" });
    expect(mocks.deleteFromS3).toHaveBeenCalledWith({
      key: "ventures/venture-1/submissions/sub-1/old.pdf",
    });
  });

  it("keeps the object when the replacement lands on the same key", async () => {
    wire({
      existing: {
        data: submissionRow({ storage_path: "ventures/venture-1/submissions/sub-1/pitch.pdf" }),
      },
    });
    await upload({ fileName: "pitch.pdf" });
    expect(mocks.deleteFromS3).not.toHaveBeenCalled();
  });

  it("still saves the submission when cleaning up the old object fails", async () => {
    wire({ existing: { data: submissionRow() } });
    mocks.deleteFromS3.mockRejectedValue(new Error("S3 down"));
    await expect(upload({ fileName: "revised.pdf" })).resolves.toMatchObject({ success: true });
  });

  it("records the signed-in user rather than the studentId the caller passed", async () => {
    const recorder = wire({ user: { id: "auth-user" } });
    await upload({ studentId: "someone-else" });
    expect(recorder.inserted[0].student_id).toBe("auth-user");
  });

  it("falls back to the studentId when the token resolves to no user", async () => {
    const recorder = wire({ user: null });
    await upload({ studentId: "student-9" });
    expect(recorder.inserted[0].student_id).toBe("student-9");
  });

  it("trims the note", async () => {
    const recorder = wire();
    await upload({ note: "  looks good  " });
    expect(recorder.inserted[0].note).toBe("looks good");
  });

  it("stores a blank note as null", async () => {
    const recorder = wire();
    await upload({ note: "   " });
    expect(recorder.inserted[0].note).toBeNull();
  });

  it("removes the previous submission row before inserting the new one", async () => {
    const recorder = wire({ existing: { data: submissionRow() } });
    await upload({ fileName: "revised.pdf" });
    expect(recorder.rowDeletes).toBe(1);
    expect(recorder.inserted[0].id).toBe("sub-1");
  });

  it("inserts without a delete when there is no previous submission", async () => {
    const recorder = wire();
    await upload();
    expect(recorder.rowDeletes).toBe(0);
  });

  it("surfaces a failure to remove the previous submission row", async () => {
    wire({
      existing: { data: submissionRow() },
      rowDelete: { error: { message: "row locked" } },
    });
    await expect(upload({ fileName: "revised.pdf" })).rejects.toThrow(
      "Could not replace the previous submission: row locked",
    );
  });

  it("surfaces a database save failure", async () => {
    wire({ insert: { data: null, error: { message: "constraint violated" } } });
    await expect(upload()).rejects.toThrow("Database save failed: constraint violated");
  });

  it("returns the saved row", async () => {
    wire({ insert: { data: { id: "sub-7", file_name: "pitch.pdf" } } });
    await expect(upload()).resolves.toEqual({
      success: true,
      submission: { id: "sub-7", file_name: "pitch.pdf" },
    });
  });

  it("marks a submission with no due date as on time", async () => {
    const recorder = wire();
    await upload();
    expect(recorder.inserted[0].is_late).toBe(false);
  });

  it("sends the caller's token to Supabase", async () => {
    wire();
    await upload({ authHeader: "Bearer token-1" });
    const options = mocks.createClient.mock.calls[0][2];
    expect(options.global.headers.Authorization).toBe("Bearer token-1");
    expect(options.auth.persistSession).toBe(false);
  });
});

describe("processDownloadSubmission", () => {
  it("refuses a request that names neither a KPI nor a submission", async () => {
    wire();
    await expect(download({ kpiId: undefined })).rejects.toThrow(
      "Missing kpiId or submissionId parameter.",
    );
  });

  it("refuses to run when the server has no Supabase configuration", async () => {
    unsetSupabaseEnv();
    wire();
    await expect(download()).rejects.toThrow("Server database configuration is missing.");
  });

  it("refuses a request with no token", async () => {
    wire();
    await expect(download({ authHeader: "" })).rejects.toThrow(
      "You must be signed in to download evidence.",
    );
  });

  it("reports a submission that is not there", async () => {
    fakeSupabase({ kpi_submissions: { select: { data: null, error: null } } });
    await expect(download()).rejects.toThrow("Submission evidence file not found.");
  });

  it("reports the code and message when the lookup fails", async () => {
    fakeSupabase({
      kpi_submissions: { select: { data: null, error: { code: "42501", message: "denied" } } },
    });
    await expect(download()).rejects.toThrow("Submission evidence file not found (42501: denied).");
  });

  it("looks the submission up by its KPI when given a kpiId", async () => {
    const recorder = fakeSupabase({ kpi_submissions: { select: { data: submissionRow() } } });
    await download({ kpiId: "kpi-1" });
    expect(recorder.filters).toContainEqual(["kpi_id", "kpi-1"]);
  });

  it("looks the submission up by its own id when given no kpiId", async () => {
    const recorder = fakeSupabase({ kpi_submissions: { select: { data: submissionRow() } } });
    await download({ kpiId: undefined, submissionId: "sub-1" });
    expect(recorder.filters).toContainEqual(["id", "sub-1"]);
  });

  it("signs the stored object under its original filename", async () => {
    fakeSupabase({ kpi_submissions: { select: { data: submissionRow() } } });
    await download();
    expect(mocks.getSignedDownloadUrl).toHaveBeenCalledWith({
      key: "ventures/venture-1/submissions/sub-1/old.pdf",
      filename: "old.pdf",
    });
  });

  it("returns the signed url alongside the file metadata", async () => {
    fakeSupabase({ kpi_submissions: { select: { data: submissionRow() } } });
    await expect(download()).resolves.toEqual({
      success: true,
      url: "https://s3.example/signed",
      filename: "old.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
    });
  });

  it("strips the Bearer prefix whatever its casing", async () => {
    fakeSupabase({ kpi_submissions: { select: { data: submissionRow() } } });
    await download({ authHeader: "bearer token-2" });
    expect(mocks.createClient.mock.calls[0][2].global.headers.Authorization).toBe("Bearer token-2");
  });
});
