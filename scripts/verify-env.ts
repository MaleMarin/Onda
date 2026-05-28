/**
 * Verifica que todas las variables de entorno críticas estén definidas
 * antes de deployar a producción.
 *
 * Uso:
 *   npm run env:verify
 *
 * Salida:
 *  - exit 1 si falta alguna variable crítica.
 *  - exit 0 con warnings si faltan variables opcionales.
 *  - exit 0 sin warnings si está todo en orden.
 *
 * Cargamos `.env.local` si existe para que el script sirva en local
 * sin necesidad de exportar variables a mano.
 */

import path from "path";
import fs from "fs";

const envLocal = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  try {
    require("dotenv").config({ path: envLocal });
  } catch {
    // dotenv es dependencia del proyecto; si no está disponible seguimos
    // leyendo solo de process.env (caso CI sin node_modules locales).
  }
}

type RequiredVar = { name: string; critical: boolean };

const REQUIRED_VARS: RequiredVar[] = [
  // WhatsApp
  { name: "WHATSAPP_ACCESS_TOKEN", critical: true },
  { name: "WHATSAPP_PHONE_NUMBER_ID", critical: true },
  { name: "WHATSAPP_WEBHOOK_SECRET", critical: true },
  { name: "WHATSAPP_VERIFY_TOKEN", critical: true },
  { name: "WHATSAPP_LOG_PEPPER", critical: true },
  { name: "WHATSAPP_DIAG_TOKEN", critical: true },
  // Templates (críticas para ventana 24h, opcionales hasta aprobación de Meta)
  { name: "WHATSAPP_TEMPLATE_REACTIVATION", critical: false },
  { name: "WHATSAPP_TEMPLATE_WELCOME_OPTIN", critical: false },
  { name: "WHATSAPP_TEMPLATE_SERVICE_NOTICE", critical: false },
  // KV
  { name: "KV_REST_API_URL", critical: true },
  { name: "KV_REST_API_TOKEN", critical: true },
  // Admin
  { name: "ADMIN_SECRET", critical: true },
  // IA
  { name: "OPENAI_API_KEY", critical: true },
  // Alertas
  { name: "SPENDING_ALERT_DAILY_USD", critical: false },
  { name: "SPENDING_ALERT_WEBHOOK_URL", critical: false },
];

let hasErrors = false;
let hasWarnings = false;

console.log("\n# ── VERIFICACIÓN DE ENTORNO ONDA ────────────────────\n");

for (const v of REQUIRED_VARS) {
  const value = process.env[v.name];
  const defined = typeof value === "string" && value.length > 0;
  if (!defined && v.critical) {
    console.error(`❌ FALTA (crítica): ${v.name}`);
    hasErrors = true;
  } else if (!defined && !v.critical) {
    console.warn(`⚠️  FALTA (opcional): ${v.name}`);
    hasWarnings = true;
  } else {
    const preview = value!.slice(0, 4) + "****";
    console.log(`✅ OK: ${v.name} (${preview})`);
  }
}

console.log("\n# ────────────────────────────────────────────────────");

if (hasErrors) {
  console.error(
    "\n🚨 Hay variables críticas faltantes. No deployar hasta resolverlas.\n"
  );
  process.exit(1);
} else if (hasWarnings) {
  console.warn(
    "\n⚠️  Hay variables opcionales faltantes. Algunas funciones estarán desactivadas.\n"
  );
  process.exit(0);
} else {
  console.log("\n✅ Entorno completo. Listo para producción.\n");
  process.exit(0);
}
