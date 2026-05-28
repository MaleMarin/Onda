import { beforeEach, describe, expect, it, vi } from "vitest";

const { kvMock } = vi.hoisted(() => ({
  kvMock: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    ttl: vi.fn(),
  },
}));

vi.mock("@vercel/kv", () => ({ kv: kvMock }));

import {
  isFirstContact,
  isOptedOut,
  isWindowActive,
  markAsSeen,
  renewMessageWindow,
  setOptIn,
  setOptOut,
} from "@/lib/waCompliance";

describe("waCompliance (KV configurado, mock)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KV_REST_API_URL = "https://example.test";
    process.env.KV_REST_API_TOKEN = "token-test";
  });

  it("setOptOut escribe en KV", async () => {
    kvMock.set.mockResolvedValueOnce("OK");
    await setOptOut("+56999999999");
    expect(kvMock.set).toHaveBeenCalled();
  });

  it("setOptIn borra clave de opt-out", async () => {
    kvMock.del.mockResolvedValueOnce(1);
    await setOptIn("+56999999999");
    expect(kvMock.del).toHaveBeenCalled();
  });

  it("isOptedOut es true si hay valor", async () => {
    kvMock.get.mockResolvedValueOnce("1");
    await expect(isOptedOut("+56999999999")).resolves.toBe(true);
  });

  it("renewMessageWindow renueva ventana", async () => {
    kvMock.set.mockResolvedValueOnce("OK");
    await renewMessageWindow("+56999999999");
    expect(kvMock.set).toHaveBeenCalled();
  });

  it("isWindowActive con ttl positivo", async () => {
    kvMock.ttl.mockResolvedValueOnce(3600);
    await expect(isWindowActive("+56999999999")).resolves.toBe(true);
  });

  it("isWindowActive con clave ausente (ttl -2) → false", async () => {
    kvMock.ttl.mockResolvedValueOnce(-2);
    await expect(isWindowActive("+56999999999")).resolves.toBe(false);
  });

  it("isFirstContact sin marca seen", async () => {
    kvMock.get.mockResolvedValueOnce(null);
    await expect(isFirstContact("+56999999999")).resolves.toBe(true);
  });

  it("markAsSeen guarda marca", async () => {
    kvMock.set.mockResolvedValueOnce("OK");
    await markAsSeen("+56999999999");
    expect(kvMock.set).toHaveBeenCalled();
  });

  it("opt-out sobrevive cold start: el TTL configurado es ≥ 2 años", async () => {
    kvMock.set.mockResolvedValueOnce("OK");
    await setOptOut("+56999999999");
    const callArgs = kvMock.set.mock.calls[kvMock.set.mock.calls.length - 1];
    const opts = callArgs[2] as { ex?: number };
    expect(opts.ex).toBeGreaterThanOrEqual(2 * 365 * 24 * 60 * 60);
  });
});

describe("waCompliance (KV NO configurado en producción) — alerta explícita", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    Object.assign(process.env, { NODE_ENV: "production" });
  });

  it("setOptOut en producción sin KV: logguea error explícito (riesgo documentado)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await setOptOut("+56999999999");
    expect(errSpy).toHaveBeenCalled();
    const msgs = errSpy.mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => m.includes("PRODUCCIÓN sin Vercel KV"))).toBe(true);
    Object.assign(process.env, { NODE_ENV: ORIGINAL_NODE_ENV });
  });
});
