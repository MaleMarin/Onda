/**
 * Bienvenidas y copy de picker alineadas al locale del chat (pt-BR vs es-LATAM).
 * El locale lo fija el estado de la app (localStorage / prefs); por defecto es es-LATAM.
 * Aquí no se lee el navegador: solo se ramifica por `OndaChatLocale` recibido.
 */

import { EjeOnda } from "@/content/types";
import type { OndaChatLocale } from "./userPreferences";

const MAIN_WELCOME_CLOSING_ES = "Elige una Onda para comenzar.";
const MAIN_WELCOME_CLOSING_PT = "Escolha uma Onda para começar.";

const MAIN_WELCOME_BODY_ES = `¡Hola! 👋 Soy Onda, el asistente de IA de Precisar.

¿Algo que leíste, viste o escuchaste te dejó pensando? ¿O hay un tema que te da curiosidad?

Aquí podemos comprender mejor la información, ponerla en contexto y encontrar fuentes cuando hagan falta.

**${MAIN_WELCOME_CLOSING_ES}**`;

const MAIN_WELCOME_BODY_PT = `Olá! 👋 Sou a Onda, assistente de IA da Precisar.

Algo que você leu, viu ou ouviu fez você pensar? Ou tem algum assunto que desperta sua curiosidade?

Aqui podemos compreender melhor as informações, colocá-las em contexto e encontrar fontes quando forem úteis.

**${MAIN_WELCOME_CLOSING_PT}**`;

const EJE_PRESENTATION: Record<
  EjeOnda,
  { nameEs: string; namePt: string; descriptionEs: string; descriptionPt: string }
> = {
  [EjeOnda.A_MANO]: {
    nameEs: "Onda A Mano",
    namePt: "Onda A Mano",
    descriptionEs:
      "Para aterrizar lo digital sin enredos: mensajes, noticias, audios y dudas del día a día.",
    descriptionPt: "Mensagens, notícias e apps do cotidiano, em linguagem simples.",
  },
  [EjeOnda.CIVITA]: {
    nameEs: "Onda Civita",
    namePt: "Onda Civita",
    descriptionEs:
      "Para entender la vida pública con criterios claros, contexto y fuentes cuando estén disponibles: instituciones, decisiones y lenguaje claro.",
    descriptionPt: "Instituições e temas públicos, com linguagem clara e neutra.",
  },
  [EjeOnda.PROFES]: {
    nameEs: "Onda Profes",
    namePt: "Onda Profes",
    descriptionEs:
      "Para enseñar con IA crítica: actividades, rúbricas y herramientas sin perder el criterio.",
    descriptionPt: "Ideias para aula e bom uso da IA com alunos.",
  },
};

function getTimeGreeting(locale: OndaChatLocale): string {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  if (locale === "pt-BR") {
    if (day === 1 && hour < 12) {
      return "🌞 **Boa segunda!** Esta semana você pode treinar seu critério digital passo a passo.";
    }
    if (day === 5 && hour >= 20) {
      return "🌙 **Boa sexta à noite!** Se quiser, hoje podemos ir mais leve.";
    }
    if (hour >= 6 && hour < 12) return "🌞 Bom dia.";
    if (hour >= 12 && hour < 20) return "⛅ Boa tarde.";
    return "🌙 Boa noite.";
  }
  if (day === 1 && hour < 12) {
    return "🌞 **¡Buen lunes!** Esta semana puedes entrenar tu criterio digital paso a paso.";
  }
  if (day === 5 && hour >= 20) {
    return "🌙 **¡Buen viernes noche!** Si quieres, hoy podemos ir más liviano.";
  }
  if (hour >= 6 && hour < 12) return "🌞 Buenos días.";
  if (hour >= 12 && hour < 20) return "⛅ Buenas tardes.";
  return "🌙 Buenas noches.";
}

export function getLocalizedMainWelcome(locale: OndaChatLocale): string {
  // Bienvenida breve y una sola invitación a elegir; evitar doble saludo horario.
  return locale === "pt-BR" ? MAIN_WELCOME_BODY_PT : MAIN_WELCOME_BODY_ES;
}

export function getLocalizedShortWelcome(locale: OndaChatLocale): string {
  const greeting = getTimeGreeting(locale);
  const open = locale === "pt-BR" ? "Olá!" : "¡Hola!";
  if (locale === "pt-BR") {
    return `${open} ${greeting}\n\nEm qual onda trabalhamos hoje? Estou aqui para o que precisar — escolha uma e seguimos.`;
  }
  return "¡Hola! Me alegra verte 😊 ¿Qué Onda activamos hoy? 👇";
}

function shortWelcomeOpen(locale: OndaChatLocale): string {
  return locale === "pt-BR" ? "Olá!" : "¡Hola!";
}

export function getLocalizedWelcomeWithTema(tema: string, locale: OndaChatLocale): string {
  const temaTrim = (tema || "").trim().slice(0, 80);
  if (!temaTrim) return getLocalizedShortWelcome(locale);
  if (locale === "pt-BR") {
    return `${shortWelcomeOpen(locale)} Que bom te ver. Continuamos trabalhando em ${temaTrim} ou buscamos novas evidências hoje?`;
  }
  return `Hola de nuevo. ¿Seguimos trabajando en ${temaTrim} o buscamos nuevas evidencias hoy?`;
}

export function getLocalizedWelcomeWithPreferredEje(eje: EjeOnda, locale: OndaChatLocale): string {
  const { nameEs, namePt } = EJE_PRESENTATION[eje];
  const name = locale === "pt-BR" ? namePt : nameEs;
  if (locale === "pt-BR") {
    return `Olá de novo! Vejo que da última vez trabalhamos em ${name}. Quer continuar aí ou explorar uma nova hoje?`;
  }
  return `Hola de nuevo. Veo que la última vez trabajamos en ${name}. ¿Quieres continuar ahí o exploramos una nueva hoy?`;
}

export function getLocalizedGreetingNewDay(_lastEje: EjeOnda | null | undefined, locale: OndaChatLocale): string {
  const now = new Date();
  if (locale === "pt-BR") {
    const weekdayRaw = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(now);
    const weekday = weekdayRaw.toLowerCase();
    return `Olá! Que bom te ver de novo — hoje é ${weekday}. Qual Onda vamos ativar hoje?`;
  }
  const dayName = new Date().toLocaleDateString("es-419", { weekday: "long" });
  const dayLower = dayName.toLowerCase();
  return `¡Hola! Hoy es ${dayLower}. ¿Qué Onda activamos para tu día? 👇`;
}

export function getLocalizedMessageAfterPickerChoice(eje: EjeOnda, locale: OndaChatLocale): string {
  const p = EJE_PRESENTATION[eje];
  const name = locale === "pt-BR" ? p.namePt : p.nameEs;
  const description = locale === "pt-BR" ? p.descriptionPt : p.descriptionEs;
  if (locale === "pt-BR") {
    return `Ótimo! Estamos na **${name}**. ${description} Escolha uma opção do menu ou escreva o que precisar.`;
  }
  return `¡Genial! Estamos en **${name}**. ${description} Elige una opción del menú o escribe lo que necesites.`;
}
