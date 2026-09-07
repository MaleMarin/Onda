import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeErrorRecord } from "@/lib/auditStore";

const SECRET = "el gobierno va a quitar las pensiones este mes";

describe("sanitizeErrorRecord", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("en producción no incluye userMessage ni botResponse", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ONDA_AUDIT_DEBUG", "");
    const out = sanitizeErrorRecord({
      source: "chat",
      userMessage: SECRET,
      botResponse: "respuesta completa del bot",
      error: "timeout",
      sessionId: "sess-abc-123",
      route: "/api/errors",
      requestId: "req-1",
    });
    const dumped = JSON.stringify(out);
    expect(dumped).not.toContain(SECRET);
    expect(dumped).not.toContain("respuesta completa del bot");
    expect(out.userMessage).toBeUndefined();
    expect(out.botResponse).toBeUndefined();
    expect(out.userMessageLen).toBe(SECRET.length);
    expect(out.botResponseLen).toBe("respuesta completa del bot".length);
    expect(out.sessionHash).toMatch(/^[a-f0-9]{16}$/);
    expect(out.route).toBe("/api/errors");
    expect(out.error).toBe("timeout");
  });

  it("en desarrollo tampoco guarda texto si no hay ONDA_AUDIT_DEBUG=1", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ONDA_AUDIT_DEBUG", "");
    const out = sanitizeErrorRecord({
      source: "chat",
      userMessage: SECRET,
    });
    expect(JSON.stringify(out)).not.toContain(SECRET);
    expect(out.userMessage).toBeUndefined();
  });

  it("con flag de debug fuera de producción puede conservar un recorte", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ONDA_AUDIT_DEBUG", "1");
    const out = sanitizeErrorRecord({
      source: "chat",
      userMessage: SECRET,
    });
    expect(out.userMessage).toBe(SECRET);
  });
});
