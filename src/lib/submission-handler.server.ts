import { createClient } from "@supabase/supabase-js";
import { buildSubmissionS3Key, uploadToS3, getSignedDownloadUrl, deleteFromS3 } from "./s3.server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_NOTE_LENGTH = 1000;
const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "txt",
  "rtf",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
]);

export async function processUploadSubmission(params: {
  kpiId: string;
  ventureId: string;
  studentId?: string;
  note: string;
  fileBuffer: Buffer | null;
  fileName: string;
  mimeType: string;
  authHeader?: string;
}) {
  const {
    kpiId,
    ventureId,
    studentId = "",
    note,
    fileBuffer,
    fileName,
    mimeType,
    authHeader,
  } = params;

  if (!kpiId || !ventureId) {
    throw new Error("Missing required kpiId or ventureId.");
  }

  if (note.length > MAX_NOTE_LENGTH) {
    throw new Error(
      `Supporting explanation exceeds maximum limit of ${MAX_NOTE_LENGTH} characters.`,
    );
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Server database configuration is missing.");
  }

  const token = (authHeader || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new Error("You must be signed in to submit evidence.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  let authUserId = studentId;
  const { data: userData } = await supabase.auth.getUser(token);
  if (userData?.user) {
    authUserId = userData.user.id;
  }

  // Fetch KPI details to enforce rules
  const { data: kpi, error: kpiErr } = await supabase
    .from("venture_kpis")
    .select("id, venture_id, is_locked, due_date, score")
    .eq("id", kpiId)
    .single();

  if (kpiErr || !kpi) {
    console.error("[Submission] venture_kpis lookup failed", { kpiId, kpiErr });
    throw new Error(
      kpiErr
        ? `Target KPI record not found (${kpiErr.code || "unknown"}: ${kpiErr.message}).`
        : "Target KPI record not found.",
    );
  }

  if (kpi.is_locked || kpi.score !== null) {
    throw new Error("Submission is locked or scored. Editing is disabled.");
  }

  if (kpi.due_date) {
    const dueDateObj = new Date(kpi.due_date);
    if (!Number.isNaN(dueDateObj.getTime()) && new Date() > dueDateObj) {
      throw new Error("Submission editing closed after the deadline.");
    }
  }

  // Fetch existing submission record if available
  const { data: existingSub } = await supabase
    .from("kpi_submissions")
    .select("id, file_name, storage_path, size_bytes, mime_type")
    .eq("kpi_id", kpiId)
    .maybeSingle();

  const submissionId = existingSub?.id || crypto.randomUUID();

  let storagePath = existingSub?.storage_path || "";
  let finalFileName = existingSub?.file_name || "";
  let finalSizeBytes = existingSub?.size_bytes || 0;
  let finalMimeType = existingSub?.mime_type || "application/octet-stream";

  // Upload new file to S3 if provided
  if (fileBuffer && fileName) {
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File exceeds 10 MB maximum limit (${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB).`,
      );
    }

    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(
        `File format '.${ext}' is unsupported. Please upload a Document or ZIP file.`,
      );
    }

    const oldStoragePath = existingSub?.storage_path;

    storagePath = buildSubmissionS3Key(ventureId, submissionId, fileName);
    finalFileName = fileName;
    finalSizeBytes = fileBuffer.length;
    finalMimeType = mimeType;

    await uploadToS3({
      key: storagePath,
      body: fileBuffer,
      contentType: mimeType,
    });

    if (oldStoragePath && oldStoragePath !== storagePath) {
      try {
        await deleteFromS3({ key: oldStoragePath });
      } catch (delErr) {
        console.warn("[S3 Cleanup Warning] Failed to delete previous file:", delErr);
      }
    }
  } else if (!existingSub) {
    throw new Error("Please select an evidence file to upload.");
  }

  const isLate = kpi.due_date ? new Date() > new Date(kpi.due_date) : false;

  const submissionPayload = {
    id: submissionId,
    venture_id: ventureId,
    kpi_id: kpiId,
    student_id: authUserId || studentId,
    file_name: finalFileName,
    storage_path: storagePath,
    size_bytes: finalSizeBytes,
    mime_type: finalMimeType,
    note: note.trim() || null,
    submitted_at: new Date().toISOString(),
    is_late: isLate,
  };

  if (existingSub) {
    const { error: replaceErr } = await supabase
      .from("kpi_submissions")
      .delete()
      .eq("id", existingSub.id);

    if (replaceErr) {
      throw new Error(`Could not replace the previous submission: ${replaceErr.message}`);
    }
  }

  const { data: savedSubmission, error: saveErr } = await supabase
    .from("kpi_submissions")
    .insert(submissionPayload)
    .select()
    .single();

  if (saveErr) {
    throw new Error(`Database save failed: ${saveErr.message}`);
  }

  return { success: true, submission: savedSubmission };
}

export async function processDownloadSubmission(params: {
  kpiId?: string;
  submissionId?: string;
  authHeader?: string;
}) {
  const { kpiId, submissionId, authHeader } = params;

  if (!kpiId && !submissionId) {
    throw new Error("Missing kpiId or submissionId parameter.");
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Server database configuration is missing.");
  }

  const token = (authHeader || "").replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new Error("You must be signed in to download evidence.");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  let queryBuilder = supabase.from("kpi_submissions").select("*");
  if (kpiId) {
    queryBuilder = queryBuilder.eq("kpi_id", kpiId);
  } else {
    queryBuilder = queryBuilder.eq("id", submissionId);
  }

  const { data: submission, error: subErr } = await queryBuilder.maybeSingle();

  if (subErr || !submission) {
    console.error("[Submission] kpi_submissions lookup failed", { kpiId, submissionId, subErr });
    throw new Error(
      subErr
        ? `Submission evidence file not found (${subErr.code || "unknown"}: ${subErr.message}).`
        : "Submission evidence file not found.",
    );
  }

  const downloadUrl = await getSignedDownloadUrl({
    key: submission.storage_path,
    filename: submission.file_name,
  });

  return {
    success: true,
    url: downloadUrl,
    filename: submission.file_name,
    mimeType: submission.mime_type,
    sizeBytes: submission.size_bytes,
  };
}
