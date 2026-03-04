export enum EjeOnda {
  A_MANO = "A_MANO",
  CIVITA = "CIVITA",
  PROFES = "PROFES",
}

export type WorkflowState =
  | "ROOT"
  | "A_MANO_MENU"
  | "A_MANO_6_IA_SUBMENU"
  | "CIVITA_WELCOME_FLOW"
  | "CIVITA_MENU"
  | "CIVITA_TEMAS_MENU"
  | "PROFES_MENU"
  | "ACTIVE_FLOW";

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  image?: string;
  audio?: boolean;
  flowId?: string;
  /** Si el modelo incluyó una guía (ej. [ONDA_GUIA:estafa]), id para mostrar imagen en /guides/{guideId}.png */
  guideId?: string;
  /** true si es respuesta generada por la API (stream); false/undefined en bienvenida e intros de menú. Usado para mostrar TTS solo en respuestas generadas. */
  isGenerated?: boolean;
  /** true si es el mensaje con las 3 preguntas del ítem de menú; en ese caso no se muestran los chips de sugerencias genéricas abajo. */
  isMenuIntro?: boolean;
  /** Preguntas de seguimiento relacionadas con la respuesta (2–4), redactadas como la usuaria preguntaría. Si existen, se muestran como chips en lugar de las genéricas. */
  suggestions?: string[];
}

export interface EjeConfig {
  id: EjeOnda;
  name: string;
  color: string;
  bgColor: string;
  /** Emoji o texto de respaldo cuando no se usa imagen. */
  icon: string;
  /** Ruta a la imagen del icono (mano, pasaporte, red). */
  iconImage?: string;
  description: string;
  placeholder: string;
}

export interface MenuOption {
  id: string;
  label: string;
  intro: string;
  internalPrompt?: string;
  isSubmenu?: boolean;
}
