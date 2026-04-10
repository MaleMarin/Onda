import { EjeOnda } from "@/content/types";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Detecta troca explícita de Onda (PT/ES), p. ex. mensagem só "Cívita", "Mão", "Professores".
 * Devolve o texto restante para enviar ao modelo (vazio se era só seleção).
 */
export function parseWaEjeSelection(userText: string): {
  eje: EjeOnda | null;
  remainder: string;
  selectionOnly: boolean;
} {
  const raw = (userText || "").trim();
  if (!raw) return { eje: null, remainder: "", selectionOnly: false };

  const prefix = /^(a\s*mano|civita|cívita|profes)\s*[:.\-–]\s*(.+)$/i.exec(raw);
  if (prefix) {
    const head = prefix[1].toLowerCase();
    const rest = (prefix[2] ?? "").trim();
    let eje: EjeOnda | null = null;
    if (/^a\s*mano$/i.test(head)) eje = EjeOnda.A_MANO;
    else if (/^civita|cívita$/i.test(head)) eje = EjeOnda.CIVITA;
    else if (/^profes$/i.test(head)) eje = EjeOnda.PROFES;
    if (eje && rest.length > 0) return { eje, remainder: rest, selectionOnly: false };
  }

  const n = norm(raw);
  const compact = n.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

  const onlyPatterns: Array<{ re: RegExp; eje: EjeOnda }> = [
    { re: /^(a\s*mano|amano|mao|mão|mano)$/, eje: EjeOnda.A_MANO },
    { re: /^(civita|cívita)$/, eje: EjeOnda.CIVITA },
    {
      re: /^(profes|professores|professor|professoras|docentes)$/,
      eje: EjeOnda.PROFES,
    },
  ];

  for (const { re, eje } of onlyPatterns) {
    if (re.test(compact)) {
      return { eje, remainder: "", selectionOnly: true };
    }
  }

  return { eje: null, remainder: raw, selectionOnly: false };
}
