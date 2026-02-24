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
}

export interface EjeConfig {
  id: EjeOnda;
  name: string;
  color: string;
  bgColor: string;
  icon: string;
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
