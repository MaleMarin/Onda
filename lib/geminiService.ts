import { GoogleGenAI } from "@google/genai";
import { EjeOnda, type Message } from "@/content/types";
import { GLOBAL_RULES_ONDA, EJE_PROMPTS, CAPA_CONTEXTO_GLOBAL, MANDATO_NO_ALUCINACION, REGLA_VALIDACION_RIGOR_FUENTES, REGLA_VALIDACION_NEUTRALIDAD, PROTOCOLO_CERO_ALUCINACION, FRASES_BLINDAJE_POR_EJE, INTUICION_GLOBAL_GRAFEO, INTUICION_POR_EJE } from "@/content/shared";

function getApiKey(): string {
  return (
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    ""
  );
}

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private model = "gemini-2.5-flash";

  private getClient(): GoogleGenAI {
    if (this.ai) return this.ai;
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API key must be set when using the Gemini API.");
    this.ai = new GoogleGenAI({ apiKey });
    return this.ai;
  }

  async sendMessage(
    userMessage: string,
    _history: Message[],
    eje: EjeOnda,
    flowPrompt?: string,
    image?: string,
    country?: string | null
  ): Promise<string> {
    const systemInstruction = `${GLOBAL_RULES_ONDA}

${CAPA_CONTEXTO_GLOBAL}

${MANDATO_NO_ALUCINACION}

${REGLA_VALIDACION_RIGOR_FUENTES}

${REGLA_VALIDACION_NEUTRALIDAD}

${PROTOCOLO_CERO_ALUCINACION}

--- EJE ACTUAL: ${eje} ---
${EJE_PROMPTS[eje]}

--- FRASES DE BLINDAJE (consulta política, provocación o falta de datos) ---
${FRASES_BLINDAJE_POR_EJE[eje]}

${INTUICION_GLOBAL_GRAFEO}
--- INTUICIÓN GLOBAL (esta Onda) ---
${INTUICION_POR_EJE[eje]}
${country ? `PAÍS DEL USUARIO: ${country}` : ""}
${flowPrompt ? `--- INSTRUCCIÓN DE FLUJO ESPECÍFICA ---\n${flowPrompt}` : ""}
`;

    const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = [];

    if (image) {
      const base64Data = image.split(",")[1];
      const mimeType = (image.split(";")[0].split(":")[1] || "image/jpeg").trim();
      if (base64Data) {
        parts.push({ inlineData: { data: base64Data, mimeType } });
      }
      parts.push({
        text: userMessage || "Analiza esta imagen y responde según las reglas de Onda.",
      });
    } else {
      parts.push({ text: userMessage });
    }

    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: this.model,
        contents: parts,
        config: {
          systemInstruction,
          temperature: 0.7,
          // thinkingConfig: { thinkingBudget: 2500 }, // uncomment if model supports it
          // tools: [{ googleSearch: {} }], // uncomment for grounding
        },
      });

      return response.text ?? "Lo siento, tuve un problema procesando tu mensaje. Intentemos de nuevo.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Hubo un error de conexión. Por favor, intenta más tarde.";
    }
  }
}

export const geminiService = new GeminiService();
