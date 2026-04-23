/**
 * Autorización Bearer para endpoints internos de insights (no exponer sin token en producción).
 */

export function insightsAuthOk(req: Request): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  const secret = process.env.INSIGHTS_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = req.headers.get("authorization")?.trim();
  return auth === `Bearer ${secret}`;
}

export function insightsUnauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
