/**
 * Etiquetas de menú por ítem (ES/PT). Los intros de 3 preguntas y `internalPrompt` siguen en `menuQuestions.ts` y `shared.ts`.
 */

import type { OndaChatLocale } from "@/lib/userPreferences";

export type MenuLocale = "es" | "pt";

export type MenuItem = {
  id: string;
  emoji: string;
  label_es: string;
  label_pt: string;
  intro?: { es: string[]; pt: string[] };
  internalPromptKey?: string;
};

export const ONDA_MAO_OPTIONS: MenuItem[] = [
  { id: "A_M1", emoji: "🔍", label_es: "Entender una noticia o un texto", label_pt: "Entender uma notícia ou um texto" },
  { id: "A_M2", emoji: "🔥", label_es: "Despejar una duda (posible estafa)", label_pt: "Tirar uma dúvida (possível golpe/estafa)" },
  { id: "A_M3", emoji: "🖐", label_es: "Estoy viviendo algo incómodo", label_pt: "Estou vivendo algo desconfortável" },
  { id: "A_M4", emoji: "🔔", label_es: "Radar de alertas", label_pt: "Radar de alertas" },
  { id: "A_M5", emoji: "👀", label_es: "Entrenar mi ojo", label_pt: "Treinar meu olhar" },
  { id: "A_M6", emoji: "🤖", label_es: "Aprender a usar IA", label_pt: "Aprender a usar IA" },
  { id: "A_M7", emoji: "🎧", label_es: "Descubrir algo que valga la pena", label_pt: "Descobrir algo que vale a pena" },
  { id: "A_M8", emoji: "🌿", label_es: "Tomar aire — Cine, Música, Artes", label_pt: "Tomar um respiro — Cinema, Música, Artes" },
  { id: "A_M9", emoji: "💬", label_es: "Dar mi opinión", label_pt: "Dar minha opinião" },
  { id: "A_M10", emoji: "✨", label_es: "Compartir Onda", label_pt: "Compartilhar ONDA" },
];

export const IA_SUBMENU_OPTIONS: MenuItem[] = [
  { id: "IA_ST", emoji: "📚", label_es: "IA para estudiar y aprender", label_pt: "IA para estudar e aprender" },
  { id: "IA_TR", emoji: "🧑‍💼", label_es: "IA para trabajar y organizar", label_pt: "IA para trabalhar e se organizar" },
  { id: "IA_CR", emoji: "🎨", label_es: "IA para creatividad", label_pt: "IA para criatividade" },
  { id: "IA_DD", emoji: "🧩", label_es: "IA en el día a día", label_pt: "IA no dia a dia" },
  { id: "IA_IC", emoji: "🧾", label_es: "Indicaciones para usar IA con criterio", label_pt: "Instruções para usar IA com critério" },
];

export const ONDA_CIVITA_OPTIONS: MenuItem[] = [
  { id: "C_N1", emoji: "🏛", label_es: "Entender una noticia o decisión pública", label_pt: "Entender uma notícia ou decisão pública" },
  { id: "C_I2", emoji: "🏦", label_es: "Entender una institución o cargo", label_pt: "Entender uma instituição ou cargo" },
  { id: "C_D3", emoji: "📜", label_es: "Mis derechos y reglas del juego", label_pt: "Meus direitos e as regras do jogo" },
  { id: "C_E4", emoji: "💰", label_es: "Economía en simple", label_pt: "Economia em simples" },
  { id: "C_M5", emoji: "🌱", label_es: "Medio ambiente y territorio", label_pt: "Meio ambiente e território" },
  { id: "C_H6", emoji: "🕐", label_es: "Historia y contexto", label_pt: "História e contexto" },
  { id: "C_P7", emoji: "🗳", label_es: "Formas de participar", label_pt: "Formas de participar" },
  { id: "C_C8", emoji: "🤝", label_es: "Convivencia y respeto", label_pt: "Convivência e respeito" },
  { id: "C_E9", emoji: "📚", label_es: "Ver ejemplos de temas", label_pt: "Ver exemplos de temas" },
  { id: "C_T10", emoji: "💻", label_es: "Tecnología e Innovación", label_pt: "Tecnologia e inovação" },
];

export const ONDA_PROFES_OPTIONS: MenuItem[] = [
  { id: "P_A1", emoji: "🧩", label_es: "Diseñar actividad con IA crítica", label_pt: "Criar atividade com IA crítica" },
  { id: "P_T2", emoji: "✏️", label_es: "Transformar tarea tradicional", label_pt: "Transformar uma tarefa tradicional" },
  { id: "P_E3", emoji: "🎓", label_es: "Ejemplos por nivel educativo", label_pt: "Exemplos por nível educacional" },
  { id: "P_R4", emoji: "📐", label_es: "Rúbricas y criterios de evaluación", label_pt: "Rubricas e critérios de avaliação" },
  { id: "P_I5", emoji: "📢", label_es: "Indicaciones para estudiantes", label_pt: "Instruções para estudantes" },
  { id: "P_T6", emoji: "🧑‍🏫", label_es: "Talleres para grupos diversos", label_pt: "Oficinas para grupos diversos" },
  { id: "P_X7", emoji: "🤖", label_es: "Explicar IA a un curso", label_pt: "Explicar IA para uma turma" },
  { id: "P_L8", emoji: "📂", label_es: "Proyectos largos con IA", label_pt: "Projetos longos com IA" },
  { id: "P_S9", emoji: "📚", label_es: "Recursos sugeridos", label_pt: "Recursos sugeridos" },
  { id: "P_G10", emoji: "📘", label_es: "Guía: IA en el aula", label_pt: "Guia: IA em sala de aula" },
];

export function getLabel(item: MenuItem, locale: MenuLocale): string {
  return locale === "pt" ? item.label_pt : item.label_es;
}

/** Texto del botón (emoji + etiqueta) según idioma de menú. */
export function formatMenuItemLabel(item: MenuItem, locale: MenuLocale): string {
  return `${item.emoji} ${getLabel(item, locale)}`;
}

/** Etiqueta mostrada en UI del chat (respeta `pt-BR` del perfil). */
export function displayMenuOptionLabel(
  opt: { label: string; label_pt?: string | undefined },
  locale: OndaChatLocale
): string {
  if (locale === "pt-BR" && opt.label_pt?.trim()) return opt.label_pt.trim();
  return opt.label;
}

/** Coincide mensaje de usuario con una opción (historial puede estar en ES o PT). */
export function userPickedMenuOption(
  opt: { label: string; label_pt?: string | undefined },
  userContent: string
): boolean {
  const t = userContent.trim();
  return t === opt.label.trim() || (!!opt.label_pt && t === opt.label_pt.trim());
}
