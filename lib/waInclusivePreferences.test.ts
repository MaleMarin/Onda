import { describe, it, expect } from "vitest";
import { parseWaInclusiveCommand } from "./waInclusivePreferences";

describe("parseWaInclusiveCommand", () => {
  it("devuelve ayuda y no reenvía texto al modelo", () => {
    const r = parseWaInclusiveCommand("+10001", "/onda ayuda");
    expect(r.helpReply?.length).toBeGreaterThan(20);
    expect(r.outgoingText.trim()).toBe("");
  });

  it("aplica parche de profundidad y limpia el mensaje", () => {
    const r = parseWaInclusiveCommand("+10002", "/onda simple");
    expect(r.prefs.responseDepth).toBe("simple");
    expect(r.outgoingText.trim()).toBe("");
  });

  it("mensaje normal pasa sin alterar", () => {
    const r = parseWaInclusiveCommand("+10003", "Hola Onda");
    expect(r.outgoingText).toBe("Hola Onda");
  });
});
