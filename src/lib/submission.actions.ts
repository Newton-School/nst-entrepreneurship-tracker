import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { processUploadSubmission, processDownloadSubmission } from "./submission-handler.server";

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
    })
  )
  .handler(async ({ data }) => {
    try {
      const fileBuffer = data.fileBase64
        ? Buffer.from(data.fileBase64, "base64")
        : null;

      return await processUploadSubmission({
        kpiId: data.kpiId,
        ventureId: data.ventureId,
        studentId: data.studentId,
        note: data.note,
        fileBuffer,
        fileName: data.fileName || "",
        mimeType: data.mimeType || "application/octet-stream",
      });
    } catch (err: any) {
      console.error("[uploadSubmissionServerFn Error]", err);
      return { success: false, error: err.message || String(err) };
    }
  });

export const downloadSubmissionServerFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      kpiId: z.string().optional(),
      submissionId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      return await processDownloadSubmission({
        kpiId: data.kpiId,
        submissionId: data.submissionId,
      });
    } catch (err: any) {
      console.error("[downloadSubmissionServerFn Error]", err);
      return { success: false, error: err.message || String(err) };
    }
  });
