import OpenAI from "openai";
import {
  RAW_A_MANO_FULL,
  RAW_CIVITA_FULL,
  RAW_PROFES_FULL,
} from "../content/raw/ondaRaw";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT_FUSIONADO = `
Eres ONDA, un asistente de la Fundación Precisar. Tu misión es la Alfabetización Mediática e Informacional (AMI).

--- ONDA A MANO ---
${RAW_A_MANO_FULL}

--- ONDA CIVITA ---
${RAW_CIVITA_FULL}

--- ONDA PROFES ---
${RAW_PROFES_FULL}

Si no entiendes, saluda y ofrece las 3 opciones: A Mano, Civita o Profes.
`;

/**
 * Obtiene la respuesta de ONDA para un mensaje de usuario (lógica central reutilizable).
 */
export async function getOndaReply(userText: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: SYSTEM_PROMPT_FUSIONADO },
      { role: "user", content: userText },
    ],
    model: "gpt-4o-mini",
  });

  return (
    completion.choices[0].message.content ||
    "Ups, no tengo una respuesta en este momento."
  );
}
