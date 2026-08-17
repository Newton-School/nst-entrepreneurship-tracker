import { defineEventHandler, readMultipartFormData, createError } from "h3";
import { processUploadSubmission } from "../../../src/lib/submission-handler.server";

export default defineEventHandler(async (event) => {
  try {
    const parts = await readMultipartFormData(event);
    if (!parts || parts.length === 0) {
      throw createError({ statusCode: 400, statusMessage: "No form data provided." });
    }

    let kpiId = "";
    let ventureId = "";
    let studentId = "";
    let note = "";
    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mimeType = "application/octet-stream";

    for (const part of parts) {
      if (part.name === "kpiId") kpiId = part.data.toString("utf-8").trim();
      else if (part.name === "ventureId") ventureId = part.data.toString("utf-8").trim();
      else if (part.name === "studentId") studentId = part.data.toString("utf-8").trim();
      else if (part.name === "note") note = part.data.toString("utf-8");
      else if (part.name === "file" && part.filename) {
        fileBuffer = part.data;
        fileName = part.filename;
        mimeType = part.type || "application/octet-stream";
      }
    }

    const authHeader = event.headers.get("authorization") || "";

    return await processUploadSubmission({
      kpiId,
      ventureId,
      studentId,
      note,
      fileBuffer,
      fileName,
      mimeType,
      authHeader,
    });
  } catch (err: any) {
    console.error("[Upload Endpoint Error]", err);
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || "Failed to process upload.",
    });
  }
});
