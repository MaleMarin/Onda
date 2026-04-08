/**
 * Bienvenidas y copy de picker alineadas al locale del chat (pt-BR vs es-LATAM).
 * Fallback: español neutro si el locale no es pt-BR.
 */

import { EjeOnda } from "@/content/types";
import type { OndaChatLocale } from "./userPreferences";

const MAIN_WELCOME_CLOSING_ES = "¿Con qué Onda quieres empezar hoy? ✨";
const MAIN_WELCOME_CLOSING_PT = "Com qual Onda você quer começar hoje? ✨";

const MAIN_WELCOME_BODY_ES = `Te doy la bienvenida a Onda 🌊, un espacio diseñado para navegar el mundo digital con menos ruido 🔊 y mucho más criterio 🧠.

Mi objetivo es acompañarte a entender mejor todo lo que ves, escuchas y recibes a diario. Aquí exploramos la información de forma simple y objetiva, siempre bajo el rigor de fuentes confiables y sin sesgos personales.

Puedes enviarme lo que necesites analizar en el formato que prefieras:

📜 Textos

🎙️ Audios

🖼️ Imágenes

🔗 Links

${MAIN_WELCOME_CLOSING_ES}`;

const MAIN_WELCOME_BODY_PT = `Dou as boas-vindas à Onda 🌊, um espaço para navegar o mundo digital com menos ruído 🔊 e muito mais critério 🧠.

Meu objetivo é te acompanhar a entender melhor o que você vê, ouve e recebe no dia a dia. Aqui exploramos a informação de forma simples e objetiva, com rigor de fontes confiáveis e sem viés pessoal.

Você pode me enviar o que precisar analisar no formato que preferir:

📜 Textos

🎙️ Áudios

🖼️ Imagens

🔗 Links

${MAIN_WELCOME_CLOSING_PT}`;

const EJE_PRESENTATION: Record<
  EjeOnda,
  { nameEs: string; namePt: string; descriptionEs: string; descriptionPt: string }
> = {
  [EjeOnda.A_MANO]: {
    nameEs: "Onda A Mano",
    namePt: "Onda A Mano",
    descriptionEs: "Vida digital cotidiana, criterio e IA.",
    descriptionPt: "Vida digital do dia a dia, critério e IA.",
  },
  [EjeOnda.CIVITA]: {
    nameEs: "Onda Civita",
    namePt: "Onda Civita",
    descriptionEs: "Vida pública, instituciones y ciudadanía.",
    descriptionPt: "Vida pública, instituições e cidadania.",
  },
  [EjeOnda.PROFES]: {
    nameEs: "Onda Profes",
    namePt: "Onda Profes",
    descriptionEs: "Docencia y proyectos educativos con IA.",
    descriptionPt: "Docência e projetos educativos com IA.",
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
  const greeting = getTimeGreeting(locale);
  const body = locale === "pt-BR" ? MAIN_WELCOME_BODY_PT : MAIN_WELCOME_BODY_ES;
  const open = locale === "pt-BR" ? "Olá!" : "¡Hola!";
  return `${open} ${greeting}\n\n${body}`;
}

export function getLocalizedShortWelcome(locale: OndaChatLocale): string {
  const greeting = getTimeGreeting(locale);
  const open = locale === "pt-BR" ? "Olá!" : "¡Hola!";
  if (locale === "pt-BR") {
    return `${open} ${greeting}\n\nEm qual onda trabalhamos hoje? Estou aqui para o que precisar — escolha uma e seguimos. 👇`;
  }
  return `${open} ${greeting}\n\n¿En qué onda trabajamos hoy? Estoy aquí para lo que necesites — elige una y seguimos. 👇`;
}

function shortWelcomeOpen(locale: OndaChatLocale): string {
  return locale === "pt-BR" ? "Olá!" : "¡Hola!";
}

export function getLocalizedWelcomeWithTema(tema: string, locale: OndaChatLocale): string {
  const temaTrim = (tema || "").trim().slice(0, 80);
  if (!temaTrim) return getLocalizedShortWelcome(locale);
  if (locale === "pt-BR") {
    return `${shortWelcomeOpen(locale)} Que bom te ver. Continuamos trabalhando em ${temaTrim} ou buscamos novas evidências hoje? 👇`;
  }
  return `¡Hola! Qué bueno verte. ¿Seguimos trabajando en ${temaTrim} o buscamos nuevas evidencias hoy? 👇`;
}

export function getLocalizedWelcomeWithPreferredEje(eje: EjeOnda, locale: OndaChatLocale): string {
  const { nameEs, namePt } = EJE_PRESENTATION[eje];
  const name = locale === "pt-BR" ? namePt : nameEs;
  if (locale === "pt-BR") {
    return `Olá de novo! Vejo que da última vez trabalhamos em ${name}. Quer continuar aí ou explorar uma nova hoje? 👇`;
  }
  return `¡Hola de nuevo! Veo que la última vez trabajamos en ${name}. ¿Quieres continuar ahí o exploramos una nueva hoy? 👇`;
}

export function getLocalizedGreetingNewDay(_lastEje: EjeOnda | null | undefined, locale: OndaChatLocale): string {
  const locTag = locale === "pt-BR" ? "pt-BR" : "es-419";
  const dayName = new Date().toLocaleDateString(locTag, { weekday: "long" });
  const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  if (locale === "pt-BR") {
    return `Olá de novo hoje! Que bom te ver — hoje é ${dayCapitalized}. Qual onda ativamos hoje? 👇`;
  }
  return `¡Hola de nuevo hoy! Qué bueno verte este ${dayCapitalized}. ¿Qué onda activamos hoy? 👇`;
}

export function getLocalizedMessageAfterPickerChoice(eje: EjeOnda, locale: OndaChatLocale): string {
  const p = EJE_PRESENTATION[eje];
  const name = locale === "pt-BR" ? p.namePt : p.nameEs;
  const description = locale === "pt-BR" ? p.descriptionPt : p.descriptionEs;
  if (locale === "pt-BR") {
    return `Ótimo! Estamos na **${name}**. ${description} Escolha uma opção do menu ou escreva o que precisar. 👇`;
  }
  return `¡Genial! Estamos en **${name}**. ${description} Elige una opción del menú o escribe lo que necesites. 👇`;
}
