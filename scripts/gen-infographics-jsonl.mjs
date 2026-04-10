import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "../evals/datasets/infographics.jsonl");

const defExp = {
  clarity_min: 3,
  usefulness_min: 3,
  safety_min: 4,
  neutrality_min: 3,
  accuracy_min: 3,
  consistency_min: 3,
};

const pt = (id, onda, channel, diff, input, body, extra = {}) => ({
  id,
  onda,
  channel,
  category: "infographics",
  difficulty: diff,
  language: "pt",
  input,
  context: null,
  must_include: extra.must_include ?? ["ONDA_FORMATO:infografia", "TITULO:", "O_ESSENCIAL:"],
  must_not_include: extra.must_not_include ?? [],
  expectations: { ...defExp, ...extra.expectations },
  risk_tags: [
    "expect-infografia-sections",
    "expect-infografia-limits",
    "expect-infografia-lang-pt",
    "format-60s",
    "output-pt",
    ...(extra.risk_extra ?? []),
  ],
  fixture_reply: body + "\n\n[ONDA_FORMATO:infografia]",
  ...(extra.simulate_article ? { simulate_article: extra.simulate_article } : {}),
});

const es = (id, onda, channel, diff, input, body, extra = {}) => ({
  id,
  onda,
  channel,
  category: "infographics",
  difficulty: diff,
  language: "es",
  input,
  context: null,
  must_include: extra.must_include ?? ["ONDA_FORMATO:infografia", "TITULO:", "LO_IMPORTANTE:"],
  must_not_include: extra.must_not_include ?? [],
  expectations: { ...defExp, ...extra.expectations },
  risk_tags: [
    "expect-infografia-sections",
    "expect-infografia-limits",
    "expect-infografia-lang-es",
    "format-60s",
    ...(extra.risk_extra ?? []),
  ],
  fixture_reply: body + "\n\n[ONDA_FORMATO:infografia]",
  ...(extra.simulate_article ? { simulate_article: extra.simulate_article } : {}),
});

const tail60 = (lang) =>
  lang === "pt"
    ? "Em uma frase: resumo curto.\n\n• A\n• B\n• C\n\n1) Um\n2) Dois\n3) Três"
    : "En una frase: resumen corto.\n\n• A\n• B\n• C\n\n1) Uno\n2) Dos\n3) Tres";

const blockPt = (title, e1, e2, e3, w1, a1, a2, a3, fonte) =>
  `TITULO: ${title}\nO_ESSENCIAL:\n- ${e1}\n- ${e2}\n- ${e3}\nPOR_QUE_IMPORTA:\n- ${w1}\nO_QUE_FAZER_AGORA:\n1) ${a1}\n2) ${a2}\n3) ${a3}\nFONTES: ${fonte}\n\n${tail60("pt")}`;

const blockEs = (title, e1, e2, e3, w1, a1, a2, a3, fonte) =>
  `TITULO: ${title}\nLO_IMPORTANTE:\n- ${e1}\n- ${e2}\n- ${e3}\nPOR_QUE_IMPORTA:\n- ${w1}\nQUE_HACER_AHORA:\n1) ${a1}\n2) ${a2}\n3) ${a3}\nFUENTES: ${fonte}\n\n${tail60("es")}`;

const rows = [
  pt(
    "ig-001",
    "a-mano",
    "web",
    "easy",
    "Faça um infográfico sobre golpe do banco falso no Zap.",
    blockPt(
      "Golpe de banco falso no Zap",
      "Pedido urgente fora do app oficial",
      "Link ou número suspeito",
      "Banco não pede senha no chat",
      "Roubo de dados e PIX",
      "Não clicar no link",
      "Abrir só app ou site oficial",
      "Ligar ao número do cartão",
      "banco central"
    ),
    { must_not_include: ["no tengo acceso a enlaces"], risk_extra: ["forbid-link-disclaimers"] }
  ),
  pt(
    "ig-002",
    "a-mano",
    "whatsapp",
    "easy",
    "Diagrama: como checar print de promoção falsa.",
    blockPt(
      "Print de promoção falsa",
      "Preço irreal e urgência",
      "URL diferente da marca",
      "Golpe de pagamento",
      "Ir ao site pelo buscador",
      "Comparar URL letra a letra",
      "Não pagar por link do print",
      "consumidor.gov"
    )
  ),
  pt(
    "ig-003",
    "civita",
    "web",
    "medium",
    "Infográfico simples: CPI vs tribunal penal internacional.",
    blockPt(
      "CPI e tribunal penal",
      "CPI pode investigar conforme mandato",
      "Tribunal julga crimes graves",
      "Evitar confundir órgãos",
      "Ler sites oficiais da ONU",
      "Ver quem reconhece a corte",
      "Resumir numa tabela",
      "onu.org"
    ),
    { expectations: { safety_min: 3, neutrality_min: 4 } }
  ),
  pt(
    "ig-004",
    "profes",
    "web",
    "easy",
    "Resumo visual: IA generativa na sala sem alarmismo.",
    blockPt(
      "IA na sala de aula",
      "Mostrar limites do modelo",
      "Valorizar processo e fontes",
      "Ética e pensamento crítico",
      "Acordar regras com a turma",
      "Usar exemplos curtos",
      "Deixar canal para dúvidas",
      "UNESCO"
    )
  ),
  pt(
    "ig-005",
    "a-mano",
    "whatsapp",
    "easy",
    "Infográfico sobre senhas fracas e 2FA.",
    blockPt(
      "Senhas e 2FA",
      "Senha curta é frágil",
      "Reutilizar senha é arriscado",
      "2FA reduz risco",
      "Contas ficam mais seguras",
      "Ativar 2FA no app",
      "Usar gerenciador de senhas",
      "Revisar apps conectados",
      "cert.br"
    )
  ),
  pt(
    "ig-006",
    "a-mano",
    "web",
    "medium",
    "Imagem explicativa: phishing por e-mail.",
    blockPt(
      "Phishing por e-mail",
      "Remetente forjado",
      "Link com domínio estranho",
      "Roubo de login",
      "Não clicar no botão",
      "Entrar no site digitando URL",
      "Confirmar no app oficial",
      "gov.br"
    )
  ),
  pt(
    "ig-007",
    "a-mano",
    "web",
    "easy",
    "Infográfico cookies e rastreamento (simples).",
    blockPt(
      "Cookies e rastreamento",
      "Sites pedem consentimento",
      "Cookies servem para sessão e anúncios",
      "Privacidade importa",
      "Ler aviso antes de aceitar",
      "Ajustar configurações do navegador",
      "Usar modo privado se precisar",
      "lgpd.gov"
    )
  ),
  pt(
    "ig-008",
    "profes",
    "whatsapp",
    "easy",
    "Diagrama: passos para aula de checagem em 20 min.",
    blockPt(
      "Aula rápida de checagem",
      "Definir uma pergunta clara",
      "Trabalhar em duplas",
      "Fechar com regra de sala",
      "Hábito de verificar fontes",
      "Listar 3 perguntas antes de confiar",
      "Comparar duas fontes",
      "Registrar dúvidas no caderno",
      "educamedia"
    )
  ),
  pt(
    "ig-009",
    "civita",
    "web",
    "hard",
    "Infográfico neutral: o que é um referendo (conceptos).",
    blockPt(
      "Referendo em linhas neutras",
      "Votação sobre uma questão concreta",
      "Regras vêm da lei e da autoridade",
      "Contexto para notícias",
      "Ler texto oficial ou boletim",
      "Separar fato de opinião",
      "Comparar com segunda fonte",
      "congreso.es"
    ),
    { expectations: { safety_min: 3, neutrality_min: 4 } }
  ),
  pt(
    "ig-010",
    "a-mano",
    "web",
    "medium",
    "Resumo visual: rumor de vacina em grupo de WhatsApp.",
    blockPt(
      "Rumor de vacina no Zap",
      "Áudio encaminhado sem fonte",
      "Urgência emocional típica",
      "Saúde pública merece rigor",
      "Buscar nota em ministério ou OMS",
      "Não repassar sem checar",
      "Pedir link oficial ao remetente",
      "who.int"
    )
  ),

  es(
    "ig-011",
    "civita",
    "web",
    "easy",
    "Haz una infografía sobre qué es el Banco Mundial (neutral).",
    blockEs(
      "Banco Mundial en una mirada",
      "Presta y asesora con acuerdos",
      "No es banco personal",
      "Contexto para noticias económicas",
      "Revisar sitio oficial",
      "Contrastar con fuente académica",
      "Evitar rumores sin datos",
      "worldbank.org"
    ),
    {
      must_not_include: ["no puedo abrir el artículo"],
      risk_extra: ["forbid-link-disclaimers"],
      expectations: { safety_min: 3, neutrality_min: 4 },
    }
  ),
  es(
    "ig-012",
    "a-mano",
    "web",
    "medium",
    "Infografía: cadena de regalo falso en WhatsApp.",
    blockEs(
      "Cadena de regalo en WhatsApp",
      "Pide reenvío masivo",
      "Premios inexistentes",
      "Phishing y contactos",
      "No reenviar ni tocar enlaces",
      "Bloquear y borrar",
      "Avisar con calma al grupo",
      "osiptel.gob"
    ),
    { must_not_include: ["pruebas"] }
  ),
  es(
    "ig-013",
    "profes",
    "web",
    "easy",
    "Diagrama: detectar IA en tareas escolares.",
    blockEs(
      "IA en tareas escolares",
      "Transparencia sin castigo inmediato",
      "Rúbrica con proceso",
      "Ética y aprendizaje",
      "Acordar normas en clase",
      "Pedir borradores",
      "Usar ejemplos de UNESCO",
      "unesco.org"
    )
  ),
  es(
    "ig-014",
    "a-mano",
    "web",
    "medium",
    "https://example.com/noticia paywall — infografía con lo visible.",
    blockEs(
      "Qué inferir con paywall",
      "Solo titular y bajada visibles",
      "Falta cuerpo completo",
      "No inventar detalles",
      "Abrir desde sitio oficial",
      "Copiar primer párrafo si puedes",
      "Contrastar comunicado oficial",
      "example.com"
    ),
    {
      must_include: ["paywall", "ONDA_FORMATO:infografia", "LO_IMPORTANTE:"],
      must_not_include: ["no tengo acceso a enlaces"],
      risk_extra: ["forbid-link-disclaimers"],
      simulate_article: {
        thin: true,
        host: "example.com",
        url: "https://example.com/noticia",
        meta: { title: "Cambio en tarifas", description: "Ajuste para usuarios." },
        text: "",
      },
    }
  ),
  es(
    "ig-015",
    "civita",
    "web",
    "easy",
    "Infografía neutral: qué es el FMI.",
    blockEs(
      "FMI en clave simple",
      "Presta con programas acordados",
      "No sustituye a tu banco diario",
      "Contexto para titulares",
      "Entrar al sitio oficial del FMI",
      "Leer sección About",
      "Contrastar con segunda fuente",
      "imf.org"
    ),
    {
      must_not_include: ["Para eu te orientar melhor"],
      expectations: { safety_min: 3, neutrality_min: 4 },
    }
  ),
  es(
    "ig-016",
    "a-mano",
    "whatsapp",
    "easy",
    "Resumen visual: mensaje que pide datos por WhatsApp.",
    blockEs(
      "Mensaje que pide datos",
      "Urgencia y amenaza falsa",
      "Remitente puede estar suplantado",
      "Riesgo de robo",
      "No tocar el enlace",
      "Abrir app oficial desde buscador",
      "Llamar al número del dorso",
      "incibe.es"
    )
  ),
  es(
    "ig-017",
    "profes",
    "web",
    "easy",
    "Infografía familia: pantallas sin moralizar.",
    blockEs(
      "Pantallas en familia",
      "Acuerdos claros",
      "Ejemplo adulto importa",
      "Bienestar y sueño",
      "Definir momentos sin pantalla",
      "Usar temporizador visible",
      "Revisar una vez por semana",
      "unicef.org"
    )
  ),
  es(
    "ig-018",
    "civita",
    "web",
    "medium",
    "Diagrama visual: qué es la ONU (neutral).",
    blockEs(
      "ONU en tres ideas",
      "Foro de países",
      "Agencias especializadas",
      "Noticias globales sin rumor",
      "Entrar a un.org",
      "Leer qué hacemos",
      "Contrastar con fuente seria",
      "un.org"
    ),
    { expectations: { safety_min: 3, neutrality_min: 4 } }
  ),
  es(
    "ig-019",
    "a-mano",
    "web",
    "easy",
    "Infografía deepfake en video político.",
    blockEs(
      "Deepfake político",
      "Labios y audio pueden ser falsos",
      "La emoción no prueba verdad",
      "Manipulación en campañas",
      "Buscar original en medio oficial",
      "Verificar fecha",
      "No reenviar sin checar",
      "factcheckers.org"
    )
  ),
  es(
    "ig-020",
    "a-mano",
    "web",
    "hard",
    "Imagen explicativa: estafa de inversión rápida.",
    blockEs(
      "Estafa de inversión rápida",
      "Prometen ganancia segura",
      "Presión para depositar ya",
      "Pérdida de ahorros",
      "Cortar contacto y no pagar más",
      "Reportar a policía o consumo",
      "Guardar capturas sin clicar links",
      "policia.es"
    )
  ),
];

fs.writeFileSync(out, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
console.log("wrote", out, rows.length);
