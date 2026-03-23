import { getSpendingSummary } from "../../../../lib/spendingAlert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MISSING_ADMIN_SECRET =
  "CONFIGURACIÓN FALTANTE: ADMIN_SECRET no está definida. Este endpoint no puede operar sin esta variable.";

/**
 * GET: gasto estimado del día (UTC) y estado vs umbrales.
 * Authorization: Bearer <ADMIN_SECRET>
 */
export async function GET(req: Request) {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: MISSING_ADMIN_SECRET }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = auth.slice(7).trim();
  if (!token || token !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getSpendingSummary();
    return Response.json(summary);
  } catch (e) {
    console.error("[admin/spending]", e);
    return Response.json({ error: "Error al leer gasto" }, { status: 500 });
  }
}
