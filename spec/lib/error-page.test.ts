import { describe, it, expect } from "vitest";
import { renderErrorPage } from "@/lib/error-page";

describe("renderErrorPage", () => {
  const html = renderErrorPage();

  it("returns a complete html document", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  it("declares a charset and a viewport", () => {
    expect(html).toContain('<meta charset="utf-8" />');
    expect(html).toContain('name="viewport"');
  });

  it("tells the reader the page did not load", () => {
    expect(html).toContain("<title>This page didn't load</title>");
    expect(html).toContain("<h1>This page didn't load</h1>");
  });

  it("offers a retry and a way home", () => {
    expect(html).toContain('onclick="location.reload()"');
    expect(html).toContain('href="/"');
  });

  it("inlines its styling so it renders when the app assets are down", () => {
    expect(html).toContain("<style>");
    expect(html).not.toMatch(/<link[^>]+stylesheet/);
    expect(html).not.toMatch(/<script[^>]*\ssrc=/);
  });

  it("is the same page every time", () => {
    expect(renderErrorPage()).toBe(html);
  });
});
