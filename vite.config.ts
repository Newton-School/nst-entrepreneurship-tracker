import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

function parseMultipartBuffer(buffer: Buffer, boundary: string) {
  const parts: { name?: string; filename?: string; type?: string; data: Buffer }[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = 0;

  while (start < buffer.length) {
    const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    const nextBoundaryIndex = buffer.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    if (nextBoundaryIndex === -1) break;

    const partBuffer = buffer.subarray(boundaryIndex + boundaryBuffer.length, nextBoundaryIndex);
    const headerEndIndex = partBuffer.indexOf(Buffer.from("\r\n\r\n"));

    if (headerEndIndex !== -1) {
      const headerText = partBuffer.subarray(0, headerEndIndex).toString("utf-8");
      let bodyData = partBuffer.subarray(headerEndIndex + 4);

      if (bodyData.subarray(bodyData.length - 2).toString() === "\r\n") {
        bodyData = bodyData.subarray(0, bodyData.length - 2);
      }

      const nameMatch = headerText.match(/name="([^"]+)"/);
      const filenameMatch = headerText.match(/filename="([^"]+)"/);
      const typeMatch = headerText.match(/Content-Type:\s*([^\r\n]+)/i);

      parts.push({
        name: nameMatch ? nameMatch[1] : undefined,
        filename: filenameMatch ? filenameMatch[1] : undefined,
        type: typeMatch ? typeMatch[1].trim() : undefined,
        data: bodyData,
      });
    }

    start = nextBoundaryIndex;
  }

  return parts;
}

function apiDevMiddlewarePlugin(): Plugin {
  return {
    name: "api-dev-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

        if (url.pathname === "/api/submission/upload" && req.method === "POST") {
          try {
            const { processUploadSubmission } = await import("./src/lib/submission-handler.server");

            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(chunk as Buffer);
            }
            const bodyBuffer = Buffer.concat(chunks);
            const contentType = (req.headers["content-type"] as string) || "";

            let kpiId = "";
            let ventureId = "";
            let studentId = "";
            let note = "";
            let fileBuffer: Buffer | null = null;
            let fileName = "";
            let mimeType = "application/octet-stream";

            const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
            const boundary = match ? match[1] || match[2] : null;

            if (boundary) {
              const parts = parseMultipartBuffer(bodyBuffer, boundary);
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
            }

            const result = await processUploadSubmission({
              kpiId,
              ventureId,
              studentId,
              note,
              fileBuffer,
              fileName,
              mimeType,
              authHeader: req.headers["authorization"] as string,
            });

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          } catch (err: any) {
            console.error("[Vite Dev API Upload Error]", err);
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, statusMessage: err.message }));
            return;
          }
        }

        if (url.pathname === "/api/submission/download" && req.method === "GET") {
          try {
            const { processDownloadSubmission } = await import("./src/lib/submission-handler.server");
            const kpiId = url.searchParams.get("kpiId") || undefined;
            const submissionId = url.searchParams.get("submissionId") || undefined;

            const result = await processDownloadSubmission({
              kpiId,
              submissionId,
              authHeader: req.headers["authorization"] as string,
            });

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          } catch (err: any) {
            console.error("[Vite Dev API Download Error]", err);
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, statusMessage: err.message }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    apiDevMiddlewarePlugin(),
    tanstackStart({
      server: { entry: "server" },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
