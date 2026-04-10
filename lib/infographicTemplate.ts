/**
 * Infografía SVG 1080×1350: Liquid Glass + aurora + cards + borde iridiscente + grain.
 * Placeholders inyectados desde payload; convertir a PNG con infographicRender.
 */

export type InfographicTemplatePayload = {
  eje: "A_MANO" | "CIVITA" | "PROFES" | "GENERIC";
  title: string;
  important: string[];
  why: string[];
  actions: string[];
  sources?: string[];
  dateLabel?: string;
  /** Etiquetas de tarjetas y tipografía (accesibilidad / PT-ES). */
  locale?: "pt" | "es";
  /** Modo personas mayores: menos ítems, tipografía mayor. */
  elderFriendly?: boolean;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clampLines(lines: string[], max: number): string[] {
  return lines.slice(0, max).filter(Boolean);
}

function modeColors(eje: InfographicTemplatePayload["eje"]) {
  if (eje === "A_MANO") return { primary: "#FFB020", glow: "rgba(255,176,32,.28)", label: "ONDA A MANO" };
  if (eje === "CIVITA") return { primary: "#11C5B6", glow: "rgba(17,197,182,.26)", label: "ONDA CIVITA" };
  if (eje === "PROFES") return { primary: "#5A3DFF", glow: "rgba(90,61,255,.26)", label: "ONDA PROFES" };
  return { primary: "#2B63FF", glow: "rgba(43,99,255,.24)", label: "ONDA" };
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function renderBullets(
  items: string[],
  x: number,
  y: number,
  maxWidthChars: number,
  fontSize: number,
  lineGap: number
): { svg: string; height: number } {
  let dy = 0;
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const lines = wrapText(items[i], maxWidthChars);
    out.push(
      `<text x="${x}" y="${y + dy}" font-size="${fontSize}" fill="rgba(233,240,255,.92)" font-weight="600" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">` +
        `<tspan fill="rgba(233,240,255,.70)">• </tspan>${escapeXml(lines[0])}` +
        `</text>`
    );
    dy += lineGap;
    for (let j = 1; j < lines.length; j++) {
      out.push(
        `<text x="${x + 22}" y="${y + dy}" font-size="${fontSize}" fill="rgba(233,240,255,.86)" font-weight="550" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${escapeXml(lines[j])}</text>`
      );
      dy += lineGap;
    }
    dy += 10;
  }
  return { svg: out.join("\n"), height: dy };
}

function renderNumbered(
  items: string[],
  x: number,
  y: number,
  maxWidthChars: number,
  fontSize: number,
  lineGap: number
): { svg: string; height: number } {
  let dy = 0;
  const out: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const n = i + 1;
    const lines = wrapText(items[i], maxWidthChars);
    out.push(
      `<text x="${x}" y="${y + dy}" font-size="${fontSize}" fill="rgba(233,240,255,.92)" font-weight="650" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">` +
        `<tspan fill="rgba(233,240,255,.70)">${n}. </tspan>${escapeXml(lines[0])}` +
        `</text>`
    );
    dy += lineGap;
    for (let j = 1; j < lines.length; j++) {
      out.push(
        `<text x="${x + 28}" y="${y + dy}" font-size="${fontSize}" fill="rgba(233,240,255,.86)" font-weight="550" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${escapeXml(lines[j])}</text>`
      );
      dy += lineGap;
    }
    dy += 10;
  }
  return { svg: out.join("\n"), height: dy };
}

function glassCard(x: number, y: number, w: number, h: number, r: number): string {
  const innerPad = 2;
  return `
  <g filter="url(#softShadow)">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="rgba(255,255,255,.06)" />
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="url(#iri)" stroke-width="1.6" opacity="0.55"/>
    <rect x="${x + innerPad}" y="${y + innerPad}" width="${w - innerPad * 2}" height="${h - innerPad * 2}" rx="${r - 2}"
      fill="rgba(255,255,255,.10)" opacity="0.95"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#hi1)" opacity="0.18"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#hi2)" opacity="0.12"/>
  </g>
  `;
}

function cardTitle(x: number, y: number, t: string, fontSize: number): string {
  return `
    <text x="${x}" y="${y}" font-size="${fontSize}" fill="rgba(233,240,255,.78)" font-weight="800"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${escapeXml(t)}</text>
  `;
}

function sectionLabels(locale: "pt" | "es" | undefined): { important: string; why: string; actions: string } {
  if (locale === "pt") {
    return {
      important: "O essencial",
      why: "Por que importa",
      actions: "O que fazer agora",
    };
  }
  return {
    important: "Lo importante",
    why: "Por qué importa",
    actions: "Qué hacer ahora",
  };
}

export function buildInfographicSvg(payload: InfographicTemplatePayload): string {
  const W = 1080;
  const H = 1350;
  const pad = 72;
  const { primary, label } = modeColors(payload.eje);

  const elder = payload.elderFriendly === true;
  const titleFont = elder ? 58 : 56;
  const bodyFont = elder ? 34 : 32;
  const cardTitleFont = elder ? 30 : 26;
  const lineGap = elder ? 48 : 44;
  const maxWChars = elder ? 32 : 38;

  const title = escapeXml(payload.title).slice(0, 140);

  const important = clampLines(payload.important, elder ? 3 : 5);
  const why = clampLines(payload.why, elder ? 1 : 2);
  const actions = clampLines(payload.actions, 3);
  const sources = clampLines(payload.sources ?? [], 3);

  const dateLabel = escapeXml(payload.dateLabel ?? "");
  const labels = sectionLabels(payload.locale);

  const cardW = W - pad * 2;
  const cardR = 28;
  const gap = 22;

  const imp = renderBullets(important, pad + 40, 0, maxWChars, bodyFont, lineGap);
  const whyB = renderBullets(why, pad + 40, 0, maxWChars, bodyFont, lineGap);
  const act = renderNumbered(actions, pad + 40, 0, maxWChars, bodyFont, lineGap);

  const headerY = 74;
  const titleY = 174;

  const card1Y = 300;
  const card1H = Math.max(260, 140 + imp.height);

  const card2Y = card1Y + card1H + gap;
  const card2H = Math.max(210, 120 + whyB.height);

  const card3Y = card2Y + card2H + gap;
  const card3H = Math.max(240, 120 + act.height);

  const footerY = card3Y + card3H + 26;

  const sourcesText = sources.length
    ? sources.map((s, i) => `${i + 1}. ${s}`).join("   •   ")
    : "";

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="aur1" cx="18%" cy="0%" r="70%">
      <stop offset="0%" stop-color="rgba(43,99,255,.24)"/>
      <stop offset="60%" stop-color="rgba(43,99,255,0)"/>
    </radialGradient>
    <radialGradient id="aur2" cx="88%" cy="12%" r="70%">
      <stop offset="0%" stop-color="rgba(17,197,182,.18)"/>
      <stop offset="62%" stop-color="rgba(17,197,182,0)"/>
    </radialGradient>
    <radialGradient id="aur3" cx="50%" cy="110%" r="80%">
      <stop offset="0%" stop-color="rgba(255,176,32,.16)"/>
      <stop offset="62%" stop-color="rgba(255,176,32,0)"/>
    </radialGradient>
    <radialGradient id="aur4" cx="72%" cy="78%" r="80%">
      <stop offset="0%" stop-color="rgba(255,77,141,.12)"/>
      <stop offset="62%" stop-color="rgba(255,77,141,0)"/>
    </radialGradient>

    <linearGradient id="iri" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(43,99,255,.70)"/>
      <stop offset="35%" stop-color="rgba(17,197,182,.55)"/>
      <stop offset="65%" stop-color="rgba(255,77,141,.45)"/>
      <stop offset="100%" stop-color="rgba(90,61,255,.65)"/>
    </linearGradient>

    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="rgba(0,0,0,.30)"/>
    </filter>

    <radialGradient id="hi1" cx="0%" cy="0%" r="80%">
      <stop offset="0%" stop-color="rgba(255,255,255,.62)"/>
      <stop offset="60%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
    <radialGradient id="hi2" cx="100%" cy="0%" r="80%">
      <stop offset="0%" stop-color="rgba(255,255,255,.24)"/>
      <stop offset="65%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>

    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.07"/>
      </feComponentTransfer>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="#0b1222"/>
  <rect width="${W}" height="${H}" fill="url(#aur1)"/>
  <rect width="${W}" height="${H}" fill="url(#aur2)"/>
  <rect width="${W}" height="${H}" fill="url(#aur3)"/>
  <rect width="${W}" height="${H}" fill="url(#aur4)"/>

  <circle cx="${W * 0.22}" cy="${H * 0.18}" r="320" fill="${primary}" opacity="0.10"/>
  <circle cx="${W * 0.76}" cy="${H * 0.16}" r="280" fill="${primary}" opacity="0.07"/>

  <g>
    <text x="${pad}" y="${headerY}" font-size="22" fill="rgba(233,240,255,.72)" font-weight="700"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" letter-spacing="1.2">
      ${escapeXml(label)}
    </text>

    ${dateLabel ? `<text x="${W - pad}" y="${headerY}" text-anchor="end" font-size="20" fill="rgba(233,240,255,.55)" font-weight="600"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">${dateLabel}</text>` : ""}

    <text x="${pad}" y="${titleY}" font-size="${titleFont}" fill="rgba(233,240,255,.92)" font-weight="800"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
      ${title}
    </text>
  </g>

  ${glassCard(pad, card1Y, cardW, card1H, cardR)}
  ${glassCard(pad, card2Y, cardW, card2H, cardR)}
  ${glassCard(pad, card3Y, cardW, card3H, cardR)}

  ${cardTitle(pad + 36, card1Y + 72, labels.important, cardTitleFont)}
  ${cardTitle(pad + 36, card2Y + 72, labels.why, cardTitleFont)}
  ${cardTitle(pad + 36, card3Y + 72, labels.actions, cardTitleFont)}

  <g transform="translate(0, ${card1Y + 120})">
    ${imp.svg}
  </g>

  <g transform="translate(0, ${card2Y + 120})">
    ${whyB.svg}
  </g>

  <g transform="translate(0, ${card3Y + 120})">
    ${act.svg}
  </g>

  ${sourcesText ? `
    <text x="${pad}" y="${footerY}" font-size="20" fill="rgba(233,240,255,.55)" font-weight="650"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial">
      ${payload.locale === "pt" ? "Fontes" : "Fuentes"}: ${escapeXml(sourcesText).slice(0, 220)}
    </text>
  ` : ""}

  <rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.55"/>

</svg>
`.trim();
}
