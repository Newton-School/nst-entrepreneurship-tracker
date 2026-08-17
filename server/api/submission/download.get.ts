import { defineEventHandler, getQuery, createError, sendRedirect } from "h3";
import { processDownloadSubmission } from "../../../src/lib/submission-handler.server";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const kpiId = query.kpiId ? String(query.kpiId) : undefined;
    const submissionId = query.submissionId ? String(query.submissionId) : undefined;
    const authHeader = event.headers.get("authorization") || "";

    const result = await processDownloadSubmission({
      kpiId,
      submissionId,
      authHeader,
    });

    if (query.redirect === "true" && result.url.startsWith("http")) {
      return sendRedirect(event, result.url, 302);
    }

    return result;
  } catch (err: any) {
    console.error("[Download Endpoint Error]", err);
    throw createError({
      statusCode: err.statusCode || 404,
      statusMessage: err.message || "Could not generate download link.",
    });
  }
});
