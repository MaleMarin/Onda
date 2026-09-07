import { afterEach, describe, expect, it, vi } from "vitest";
import { isWebSearchConfigured } from "@/lib/searchWeb";

describe("isWebSearchConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("es false si no hay Tavily ni Serper", () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    vi.stubEnv("SERPER_API_KEY", "");
    expect(isWebSearchConfigured()).toBe(false);
  });

  it("es true si hay Tavily", () => {
    vi.stubEnv("TAVILY_API_KEY", "tvly-test");
    vi.stubEnv("SERPER_API_KEY", "");
    expect(isWebSearchConfigured()).toBe(true);
  });
});
