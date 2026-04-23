/**
 * POST público (rate-limited): alta de contribución comunitaria.
 * Consistente con el resto de APIs en `app/api/*` (Route Handlers).
 */
import { checkRateLimit } from "@/lib/rateLimiter";
import { saveOndaContribution, isValidTurnToken } from "@/lib/onda/contributions/saveContribution";
import type { ContributionChannel, ContributionEjeSlug } from "@/lib/onda/contributions/types";
import { normalizeContributionType } from "@/lib/onda/contributions/types";
import { CONTRIBUTION_TYPES } from "@/lib/onda/contributions/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EJE_SLUGS = new Set<ContributionEjeSlug>(["onda_a_mano", "onda_civita", "onda_profes"]);

function parseChannel(s: unknown): ContributionChannel | null {
  if (s === "web" || s === "whatsapp") return s;
  return null;
}

function parseEje(s: unknown): ContributionEjeSlug | null {
  if (typeof s !== "string") return null;
  return EJE_SLUGS.has(s as ContributionEjeSlug) ? (s as ContributionEjeSlug) : null;
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "anonymous";
    const rl = await checkRateLimit(ip, "web", 12, 3600);
    if (!rl.allowed) {
      return Response.json({ error: "Demasiadas contribuciones. Podés intentar más tarde." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const channel = parseChannel(body?.channel);
    const eje = parseEje(body?.eje);
    const conversationId = typeof body?.conversationId === "string" ? body.conversationId.trim() : undefined;
    const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : undefined;
    const turnToken = typeof body?.turnToken === "string" ? body.turnToken.trim() : "";
    const userQuestion = typeof body?.userQuestion === "string" ? body.userQuestion : "";
    const assistantResponseSummary =
      typeof body?.assistantResponseSummary === "string" ? body.assistantResponseSummary.trim() : undefined;
    const contributionText = typeof body?.contributionText === "string" ? body.contributionText.trim() : "";
    const contributionTypeRaw = typeof body?.contributionType === "string" ? body.contributionType : "";
    const topic = typeof body?.topic === "string" ? body.topic.trim() : undefined;
    const tags = Array.isArray(body?.tags) ? body.tags.filter((x: unknown) => typeof x === "string") : [];
    const sentiment =
      body?.sentiment === "negative" ||
      body?.sentiment === "neutral" ||
      body?.sentiment === "positive" ||
      body?.sentiment === "mixed"
        ? body.sentiment
        : undefined;
    const optionalContactAllowed = Boolean(body?.optionalContactAllowed);
    const locale = typeof body?.locale === "string" ? body.locale.trim() : undefined;

    if (!channel || !eje) {
      return Response.json({ error: "channel o eje inválido" }, { status: 400 });
    }
    if (!userQuestion.trim()) {
      return Response.json({ error: "userQuestion requerido" }, { status: 400 });
    }
    if (turnToken && !isValidTurnToken(turnToken)) {
      return Response.json({ error: "turnToken inválido" }, { status: 400 });
    }
    const contributionType = normalizeContributionType(contributionTypeRaw);
    if (!contributionType) {
      return Response.json({ error: "contributionType inválido", allowed: CONTRIBUTION_TYPES }, { status: 400 });
    }
    if (contributionText.length < 3) {
      return Response.json({ error: "El aporte es demasiado corto." }, { status: 400 });
    }
    if (contributionText.length > 4000) {
      return Response.json({ error: "El aporte supera el límite de caracteres." }, { status: 400 });
    }

    const result = await saveOndaContribution({
      channel,
      eje,
      conversationId,
      messageId,
      turnToken: turnToken || undefined,
      userQuestion: userQuestion.slice(0, 8000),
      assistantResponseSummary: assistantResponseSummary?.slice(0, 2000),
      contributionText,
      contributionType,
      topic,
      tags: tags.length ? tags : undefined,
      sentiment,
      optionalContactAllowed,
      locale,
    });

    if ("error" in result) {
      if (result.error === "firestore_unavailable") {
        return Response.json({ error: "El servicio de guardado no está disponible ahora." }, { status: 503 });
      }
      if (result.error === "duplicate_turn") {
        return Response.json({ error: "Ya registramos un aporte para este turno." }, { status: 409 });
      }
      return Response.json({ error: "No se pudo guardar." }, { status: 500 });
    }

    return Response.json({ ok: true, id: result.id }, { status: 201 });
  } catch (e) {
    console.error("[onda-contributions]", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
