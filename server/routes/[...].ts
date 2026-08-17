import { defineEventHandler, getRequestURL, getRequestHeaders } from "h3";
import server from "../../dist/server/server.js";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const headers = getRequestHeaders(event) as Record<string, string>;
  const method = event.method;

  const request = new Request(url, {
    method,
    headers,
    body:
      method !== "GET" && method !== "HEAD" ? (event.node?.req as unknown as BodyInit) : undefined,
    // @ts-expect-error duplex required for node fetch body
    duplex: "half",
  });

  return await server.fetch(request);
});
