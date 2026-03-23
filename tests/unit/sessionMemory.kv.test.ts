import { beforeEach, describe, expect, it, vi } from "vitest";

const { kvMock } = vi.hoisted(() => ({
  kvMock: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("@vercel/kv", () => ({ kv: kvMock }));

import { getSessionSummary, saveSessionSummary } from "@/lib/sessionMemory";

describe("sessionMemory (KV mock)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KV_REST_API_URL = "https://example.test";
    process.env.KV_REST_API_TOKEN = "token-test";
  });

  it("getSessionSummary retorna null para anonymous", async () => {
    await expect(getSessionSummary("web", "anonymous")).resolves.toBeNull();
  });

  it("getSessionSummary parsea JSON válido", async () => {
    const summary = {
      sessionDate: new Date().toISOString(),
      topics: ["t1"],
      lastIntent: "explanation",
      lastEje: "A_MANO",
    };
    kvMock.get.mockResolvedValueOnce(JSON.stringify(summary));
    await expect(getSessionSummary("web", "sess1")).resolves.toEqual(summary);
  });

  it("saveSessionSummary no op con anonymous", async () => {
    await saveSessionSummary("web", "anonymous", {
      sessionDate: new Date().toISOString(),
      topics: [],
      lastIntent: "x",
      lastEje: "A_MANO",
    });
    expect(kvMock.set).not.toHaveBeenCalled();
  });

  it("saveSessionSummary escribe en KV", async () => {
    kvMock.set.mockResolvedValueOnce("OK");
    const summary = {
      sessionDate: new Date().toISOString(),
      topics: ["a"],
      lastIntent: "fact_check",
      lastEje: "CIVITA",
    };
    await saveSessionSummary("wa", "user42", summary);
    expect(kvMock.set).toHaveBeenCalled();
  });
});
