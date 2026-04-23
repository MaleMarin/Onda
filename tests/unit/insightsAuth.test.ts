import { describe, it, expect, afterEach, vi } from "vitest";
import { insightsAuthOk } from "@/lib/insightsAuth";

describe("insightsAuthOk", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("en producción exige Bearer INSIGHTS_SECRET", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("INSIGHTS_SECRET", "test-secret-xyz");
    expect(insightsAuthOk(new Request("http://localhost"))).toBe(false);
    expect(
      insightsAuthOk(
        new Request("http://localhost", { headers: { Authorization: "Bearer wrong" } })
      )
    ).toBe(false);
    expect(
      insightsAuthOk(
        new Request("http://localhost", { headers: { Authorization: "Bearer test-secret-xyz" } })
      )
    ).toBe(true);
  });

  it("en development permite sin token", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("INSIGHTS_SECRET", "ignored");
    expect(insightsAuthOk(new Request("http://localhost"))).toBe(true);
  });
});
