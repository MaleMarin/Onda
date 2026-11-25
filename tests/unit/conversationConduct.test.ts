import { describe, expect, it } from "vitest";
import { checkConversationConduct, detectConductViolation } from "@/lib/conversationConduct";

describe("convivencia en las tres experiencias de Onda", () => {
  it("permite expresiones de frustración sin insulto dirigido", () => {
    expect(checkConversationConduct("Estoy harto, esto es una mierda").allowed).toBe(true);
  });

  it("permite analizar y denunciar mensajes discriminatorios", () => {
    expect(checkConversationConduct("Me enviaron un mensaje que dice 'los inmigrantes son una plaga'. ¿Es racista?").allowed).toBe(true);
    expect(checkConversationConduct("¿Cómo denunciar un mensaje que ofende a personas migrantes?").allowed).toBe(true);
  });

  it("permite crítica política y preguntas sobre racismo", () => {
    expect(checkConversationConduct("No estoy de acuerdo con el gobierno. ¿Cómo puedo explicarlo?").allowed).toBe(true);
    expect(checkConversationConduct("¿Qué es la xenofobia y cómo se reconoce?").allowed).toBe(true);
  });

  it("advierte ante insulto dirigido inicial sin generar una respuesta de IA", () => {
    const result = checkConversationConduct("Eres una inútil");
    expect(result.allowed).toBe(false);
    expect(result.stage).toBe("warning");
    expect(result.response).toContain("sin insultos");
  });

  it("corta la solicitud si insiste en insultos", () => {
    const result = checkConversationConduct("Eres una idiota", {
      recentUserMessages: ["Eres una inútil"],
    });
    expect(result.allowed).toBe(false);
    expect(result.stage).toBe("stop");
  });

  it("se puede retomar una conversación respetuosa después de advertencias", () => {
    expect(checkConversationConduct("¿Podemos revisar una noticia?", {
      recentUserMessages: ["Eres una inútil"],
    }).allowed).toBe(true);
  });

  it("no colabora en pedidos explícitos de acoso", () => {
    const result = checkConversationConduct("Ayúdame a humillar a una compañera");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("harassment_request");
    expect(result.stage).toBe("stop");
  });

  it("rechaza ataques xenófobos explícitos", () => {
    expect(detectConductViolation("Los inmigrantes son una plaga")).toBe("hateful_attack");
  });

  it("responde en portugués brasileño cuando corresponde", () => {
    const result = checkConversationConduct("Você é idiota", { locale: "pt-BR" });
    expect(result.stage).toBe("warning");
    expect(result.response).toContain("insultos");
  });
});
