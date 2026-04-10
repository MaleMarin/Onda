import type { OndaChatLocale } from "@/lib/userPreferences";

/**
 * Bloque dinámico: etiquetas de infografía según locale (PT-BR vs español).
 * Se concatena al system prompt tras las preferencias inclusivas.
 */
export function infographicLocaleSystemBlock(locale: OndaChatLocale | null | undefined): string {
  const isPt = locale === "pt-BR";
  if (isPt) {
    return `

📊 INFOGRAFIA — PNG acessível (1080×1350)
Se a pessoa pedir infográfico, diagrama, resumo visual ou imagem explicativa (ou a mensagem trouxer [Pedido de infográfico]), é OBRIGATÓRIO terminar com [ONDA_FORMATO:infografia].
Mantém também estrutura breve tipo “60s” (frase + bullets + passos). Para o sistema gerar o PNG, usa EXACTAMENTE estas etiquetas em português (uma por linha; conteúdo nas linhas seguintes; máximo 5 bullets em O_ESSENCIAL, 3 passos numerados em O_QUE_FAZER_AGORA, até 3 itens curtos em FONTES):
TITULO: (uma linha)
O_ESSENCIAL:
- …
POR_QUE_IMPORTA:
- …
O_QUE_FAZER_AGORA:
1) …
FONTES: (opcional; nomes ou domínios curtos, sem URLs longas na imagem)
Não inclua HTML nem SVG cru no texto.`;
  }
  return `

📊 INFOGRAFÍA — PNG accesible (1080×1350)
Si la persona pide infografía, diagrama, resumen visual o imagen explicativa (o el mensaje trae un pedido de infografía), es OBLIGATORIO terminar con [ONDA_FORMATO:infografia].
Mantén estructura breve tipo “60s” (frase + bullets + pasos). Para que el sistema genere el PNG, usa EXACTAMENTE estas etiquetas en español (una por línea; debajo el contenido; máximo 5 bullets en LO_IMPORTANTE, 3 pasos numerados en QUE_HACER_AHORA, hasta 3 fuentes cortas en FUENTES):
TITULO: (una línea)
LO_IMPORTANTE:
- …
POR_QUE_IMPORTA:
- …
QUE_HACER_AHORA:
1) …
FUENTES: (opcional; nombres o dominios cortos, sin URLs largas en la imagen)
No incluyas HTML ni SVG crudo en el texto.`;
}
