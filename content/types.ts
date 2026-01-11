export type EjeOnda = 'A_MANO' | 'CIVITA' | 'PROFES';

export type EjeConfig = {
  id: EjeOnda;
  name: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
  placeholder: string;
};

export type MenuOption = {
  id: string;
  label: string;
  intro: string;
  internalPrompt?: string;
  isSubmenu?: boolean;
};
