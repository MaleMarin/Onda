import { describe, it, expect, vi, beforeEach } from "vitest";

const setMock = vi.fn();
const delMock = vi.fn();

vi.mock("@vercel/kv", () => ({
  kv: {
    set: (...args: unknown[]) => setMock(...args),
    del: (...args: unknown[]) => delMock(...args),
  },
}));

import {
  acquireLock,
  WA_LOCK_TTL_SECONDS,
  withLock,
} from "@/lib/waMessageQueue";

describe("waMessageQueue", () => {
  beforeEach(() => {
    setMock.mockReset();
    delMock.mockReset();
  });

  it("usa TTL 25s al adquirir lock", async () => {
    setMock.mockResolvedValue("OK");
    await acquireLock("5491112345678");
    expect(setMock).toHaveBeenCalledWith(
      expect.stringMatching(/^wa:lock:/),
      "1",
      expect.objectContaining({ nx: true, ex: WA_LOCK_TTL_SECONDS })
    );
    expect(WA_LOCK_TTL_SECONDS).toBe(25);
  });

  it("withLock ejecuta release en finally aunque falle el cuerpo", async () => {
    setMock.mockResolvedValue("OK");
    delMock.mockResolvedValue(1);
    await expect(
      withLock("5491112345678", async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");
    expect(delMock).toHaveBeenCalled();
  });

  it("sin adquisición no ejecuta fn ni release", async () => {
    setMock.mockResolvedValue(null);
    const fn = vi.fn();
    const r = await withLock("5491112345678", fn);
    expect(r).toBeNull();
    expect(fn).not.toHaveBeenCalled();
    expect(delMock).not.toHaveBeenCalled();
  });
});
