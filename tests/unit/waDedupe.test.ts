import { beforeEach, describe, expect, it, vi } from "vitest";

const { kvMock } = vi.hoisted(() => ({
  kvMock: {
    set: vi.fn(),
  },
}));

vi.mock("@vercel/kv", () => ({ kv: kvMock }));

import { markMessageIfNew, WA_DEDUPE_TTL_SECONDS, _resetWaDedupeMemForTests } from "@/lib/waDedupe";

describe("waDedupe.markMessageIfNew", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetWaDedupeMemForTests();
    process.env.KV_REST_API_URL = "https://example.test";
    process.env.KV_REST_API_TOKEN = "token-test";
  });

  it("acepta un message.id la primera vez (KV NX devuelve OK)", async () => {
    kvMock.set.mockResolvedValueOnce("OK");
    await expect(markMessageIfNew("wamid.A1")).resolves.toBe(true);
    expect(kvMock.set).toHaveBeenCalledWith(
      expect.stringMatching(/^wa:msgid:/),
      "1",
      expect.objectContaining({ nx: true, ex: WA_DEDUPE_TTL_SECONDS })
    );
  });

  it("rechaza el mismo message.id la segunda vez (KV NX devuelve null)", async () => {
    kvMock.set.mockResolvedValueOnce(null);
    await expect(markMessageIfNew("wamid.A1")).resolves.toBe(false);
  });

  it("usa TTL de 24 horas exactos", () => {
    expect(WA_DEDUPE_TTL_SECONDS).toBe(86400);
  });

  it("sin id no aplica dedupe (devuelve true)", async () => {
    await expect(markMessageIfNew("")).resolves.toBe(true);
    await expect(markMessageIfNew(null)).resolves.toBe(true);
    await expect(markMessageIfNew(undefined)).resolves.toBe(true);
    expect(kvMock.set).not.toHaveBeenCalled();
  });

  it("ante error de KV cae en memoria local (fallback aceptable en dev/preview)", async () => {
    kvMock.set.mockRejectedValue(new Error("KV down"));
    await expect(markMessageIfNew("wamid.B1")).resolves.toBe(true);
    await expect(markMessageIfNew("wamid.B1")).resolves.toBe(false);
  });

  it("sin KV configurado usa memoria (true 1ª, false 2ª)", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    await expect(markMessageIfNew("wamid.C1")).resolves.toBe(true);
    await expect(markMessageIfNew("wamid.C1")).resolves.toBe(false);
    expect(kvMock.set).not.toHaveBeenCalled();
  });
});
