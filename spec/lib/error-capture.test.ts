import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

type Listener = (event: unknown) => void;

async function loadWithListeners() {
  const listeners = new Map<string, Listener>();
  vi.stubGlobal("addEventListener", (type: string, fn: Listener) => listeners.set(type, fn));
  vi.resetModules();
  const mod = await import("@/lib/error-capture");
  return { listeners, consume: mod.consumeLastCapturedError };
}

describe("consumeLastCapturedError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns nothing before anything has been captured", async () => {
    const { consume } = await loadWithListeners();
    expect(consume()).toBeUndefined();
  });

  it("returns the error carried by a global error event", async () => {
    const { listeners, consume } = await loadWithListeners();
    const boom = new Error("boom");
    listeners.get("error")?.({ error: boom });
    expect(consume()).toBe(boom);
  });

  it("falls back to the event itself when the error event carries no error", async () => {
    const { listeners, consume } = await loadWithListeners();
    const event = { message: "script error" };
    listeners.get("error")?.(event);
    expect(consume()).toBe(event);
  });

  it("returns the reason behind an unhandled rejection", async () => {
    const { listeners, consume } = await loadWithListeners();
    const reason = new Error("rejected");
    listeners.get("unhandledrejection")?.({ reason });
    expect(consume()).toBe(reason);
  });

  it("hands the error over only once", async () => {
    const { listeners, consume } = await loadWithListeners();
    listeners.get("error")?.({ error: new Error("boom") });
    expect(consume()).toBeInstanceOf(Error);
    expect(consume()).toBeUndefined();
  });

  it("keeps the newest error when two arrive", async () => {
    const { listeners, consume } = await loadWithListeners();
    const second = new Error("second");
    listeners.get("error")?.({ error: new Error("first") });
    listeners.get("error")?.({ error: second });
    expect(consume()).toBe(second);
  });

  it("still returns an error captured just inside the five second window", async () => {
    const { listeners, consume } = await loadWithListeners();
    const boom = new Error("boom");
    listeners.get("error")?.({ error: boom });
    vi.advanceTimersByTime(5_000);
    expect(consume()).toBe(boom);
  });

  it("forgets an error that is older than the five second window", async () => {
    const { listeners, consume } = await loadWithListeners();
    listeners.get("error")?.({ error: new Error("stale") });
    vi.advanceTimersByTime(5_001);
    expect(consume()).toBeUndefined();
  });

  it("drops a stale error rather than holding it for the next request", async () => {
    const { listeners, consume } = await loadWithListeners();
    listeners.get("error")?.({ error: new Error("stale") });
    vi.advanceTimersByTime(5_001);
    consume();
    vi.advanceTimersByTime(1);
    expect(consume()).toBeUndefined();
  });

  it("captures a rejection reason that is not an Error", async () => {
    const { listeners, consume } = await loadWithListeners();
    listeners.get("unhandledrejection")?.({ reason: "plain string" });
    expect(consume()).toBe("plain string");
  });
});

describe("error capture on a runtime with no addEventListener", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("imports without throwing and captures nothing", async () => {
    vi.stubGlobal("addEventListener", undefined);
    vi.resetModules();
    const mod = await import("@/lib/error-capture");
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });
});
