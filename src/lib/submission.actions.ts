import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { processUploadSubmission, processDownloadSubmission } from "./submission-handler.server";

function callerAuthHeader() {
  return getRequest()?.headers.get("authorization") || "";
}

export const uploadSubmissionServerFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      kpiId: z.string(),
      ventureId: z.string(),
      studentId: z.string().optional(),
      note: z.string().default(""),
      fileBase64: z.string().optional(),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const fileBuffer = data.fileBase64 ? Buffer.from(data.fileBase64, "base64") : null;

      return await processUploadSubmission({
        kpiId: data.kpiId,
        ventureId: data.ventureId,
        studentId: data.studentId,
        note: data.note,
        fileBuffer,
        fileName: data.fileName || "",
        mimeType: data.mimeType || "application/octet-stream",
        authHeader: callerAuthHeader(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[uploadSubmissionServerFn Error]", message);
      return { success: false, error: message };
    }
  });

export const downloadSubmissionServerFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      kpiId: z.string().optional(),
      submissionId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    try {
      return await processDownloadSubmission({
        kpiId: data.kpiId,
        submissionId: data.submissionId,
        authHeader: callerAuthHeader(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[downloadSubmissionServerFn Error]", message);
      return { success: false, error: message };
    }
  });
