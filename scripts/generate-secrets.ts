/**
 * Genera todos los secrets que Onda necesita en producción y los imprime
 * en formato listo para copiar a Vercel → Settings → Environment Variables.
 *
 * Uso:
 *   npm run secrets:generate
 *
 * Reglas:
 *  - Cada secret se genera con `crypto.randomBytes` (criptográficamente seguro).
 *  - NUNCA commitear los valores generados al repositorio.
 *  - Guardar la salida en un gestor de contraseñas (Bitwarden, 1Password, etc.).
 */

import crypto from "crypto";

function generateSecret(label: string, bytes = 32): void {
  const value = crypto.randomBytes(bytes).toString("hex");
  console.log(`${label}=${value}`);
}

console.log("\n# ── SECRETS GENERADOS PARA ONDA ─────────────────────");
console.log("# Copiar cada línea en Vercel Dashboard → Settings → Environment Variables");
console.log("# NUNCA commitear estos valores al repositorio\n");

console.log("# Hasheo de teléfonos en logs (mínimo 32 bytes)");
generateSecret("WHATSAPP_LOG_PEPPER");

console.log("\n# Token de diagnóstico interno");
generateSecret("WHATSAPP_DIAG_TOKEN", 24);

console.log("\n# Secret del panel de administración");
generateSecret("ADMIN_SECRET", 24);

console.log("\n# Token de verificación del webhook Meta");
generateSecret("WHATSAPP_VERIFY_TOKEN", 16);

console.log("\n# ─────────────────────────────────────────────────────");
console.log("# Guardar estos valores en un gestor de contraseñas");
console.log("# (1Password, Bitwarden, etc.) antes de cerrar esta ventana\n");
