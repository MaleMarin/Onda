import { describe, it, expect } from "vitest";
import { inferChatLocaleFromMessage } from "@/lib/inferChatLocale";

describe("inferChatLocaleFromMessage", () => {
  it("mantém fallback quando o texto é curto", () => {
    expect(inferChatLocaleFromMessage("oi", "pt-BR")).toBe("pt-BR");
  });

  it("tende a es-LATAM com marcadores claros em espanhol", () => {
    const t = "Gracias, necesito ayuda con una noticia de hoy ¿qué fuentes revisar?";
    expect(inferChatLocaleFromMessage(t, "pt-BR")).toBe("es-LATAM");
  });

  it("tende a pt-BR com vocabulário português", () => {
    const t = "Obrigado, não sei se essa mensagem é verdade; você pode ajudar?";
    expect(inferChatLocaleFromMessage(t, "es-LATAM")).toBe("pt-BR");
  });
});
