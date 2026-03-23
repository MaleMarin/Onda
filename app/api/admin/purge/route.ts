import { deleteUserData, purgeExpiredRecords } from "../../../../lib/auditStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MISSING_ADMIN_SECRET =
  "CONFIGURACIÓN FALTANTE: ADMIN_SECRET no está definida. El endpoint de purga no puede operar sin esta variable.";

/**
 * POST administrativo: purga por identificador o eliminación de registros vencidos.
 * Requiere Authorization: Bearer <ADMIN_SECRET>.
 *
 * No exponer públicamente: en producción usar Vercel Authentication / Access Control,
 * restricción por IP u otra capa además de este secreto.
 */
export async function POST(req: Request) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as { identifier?: unknown; purgeExpired?: unknown };
  const purgeExpired = b.purgeExpired === true;
  const identifier = typeof b.identifier === "string" ? b.identifier.trim() : "";

  if (purgeExpired && identifier) {
    return Response.json(
      { error: "Enviá solo identifier o purgeExpired: true, no ambos." },
      { status: 400 }
    );
  }

  if (purgeExpired) {
    const { deleted } = await purgeExpiredRecords();
    return Response.json({ success: true, deleted });
  }

  if (identifier) {
    const { deleted } = await deleteUserData(identifier);
    return Response.json({ success: true, deleted });
  }

  return Response.json(
    { error: 'Body JSON: { "identifier": "..." } o { "purgeExpired": true }' },
    { status: 400 }
  );
}
