import { describe, expect, it, vi } from "vitest";

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

import { CircuitOpenError, canCall } from "@/lib/circuitBreaker";

describe("circuitBreaker", () => {
  it("CircuitOpenError extiende Error y expone provider", () => {
    const e = new CircuitOpenError("openai-mini");
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("CircuitOpenError");
    expect(e.provider).toBe("openai-mini");
    expect(e.message).toContain("openai-mini");
  });

  it("canCall hace fail-open cuando KV responde (estado inicial CLOSED)", async () => {
    await expect(canCall("openai-mini")).resolves.toBe(true);
  });
});
