import { buildAdminSessionCookie, ONDA_ADMIN_COOKIE, verifyAdminAuth } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function parseBody(req: Request): Promise<{ password?: string }> {
  try {
    return (await req.json()) as { password?: string };
  } catch {
    return {};
  }
}

/**
 * POST: valida contraseña contra ADMIN_SECRET y fija cookie HttpOnly para el dashboard.
 */
export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "ADMIN_SECRET no configurada" }, { status: 500 });
  }
  const { password } = await parseBody(req);
  if (typeof password !== "string" || password !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const cookie = buildAdminSessionCookie(exp, secret);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie } });
}

/** Cierra sesión admin (borra cookie). */
export async function DELETE(req: Request) {
  if (!verifyAdminAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": `${ONDA_ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
      },
    }
  );
}
