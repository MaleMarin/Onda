/**
 * Plantillas HSM (Highly Structured Messages) aprobadas en WhatsApp Manager.
 *
 * Fuera de la ventana de 24 h, Meta SOLO permite enviar mensajes basados en
 * plantillas aprobadas previamente desde WhatsApp Manager → Business Settings →
 * Plantillas de mensajes. El nombre técnico (`name`) y el `language` deben
 * coincidir con la plantilla aprobada o el envío falla con error 132xxx.
 *
 * Por eso los nombres reales se leen de variables de entorno; los valores por
 * defecto son nombres LÓGICOS que NO existen en Meta hasta que el equipo los
 * registre y apruebe. Antes de producción: registrar las 3 plantillas y poner
 * sus nombres exactos en las variables `WHATSAPP_TEMPLATE_*`.
 */

export type WaTemplateKey =
  | "onda_reactivacion"
  | "onda_bienvenida_optin"
  | "onda_aviso_servicio";

export type WaTemplateConfig = {
  /** Clave lógica interna (no es el nombre Meta). */
  key: WaTemplateKey;
  /** Nombre EXACTO aprobado en Meta. Si vacío → no enviar. */
  name: string;
  /** Código de idioma Meta (ej. "es", "es_AR", "pt_BR"). */
  language: string;
  /** Categoría declarada en Meta (UTILITY, MARKETING, AUTHENTICATION). Sólo informativo. */
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  /** Descripción humana (para docs / logs). */
  description: string;
};

function envName(key: WaTemplateKey): string {
  if (key === "onda_reactivacion") return process.env.WHATSAPP_TEMPLATE_REACTIVATION?.trim() || "";
  if (key === "onda_bienvenida_optin") return process.env.WHATSAPP_TEMPLATE_WELCOME_OPTIN?.trim() || "";
  return process.env.WHATSAPP_TEMPLATE_SERVICE_NOTICE?.trim() || "";
}

export function getDefaultTemplateLanguage(): string {
  return process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "es";
}

/**
 * Resuelve la configuración de una plantilla por clave lógica.
 * Si no hay nombre configurado (env vacío), devuelve `null` para que el caller
 * decida no enviar (en vez de inventar un nombre que Meta rechazaría).
 */
export function resolveWaTemplate(key: WaTemplateKey): WaTemplateConfig | null {
  const name = envName(key);
  if (!name) return null;
  const language = getDefaultTemplateLanguage();
  if (key === "onda_reactivacion") {
    return {
      key,
      name,
      language,
      category: "UTILITY",
      description:
        "Reactivación tras ventana cerrada: invita al usuario a responder y reabrir la ventana de 24 h.",
    };
  }
  if (key === "onda_bienvenida_optin") {
    return {
      key,
      name,
      language,
      category: "UTILITY",
      description:
        "Confirmación de opt-in y bienvenida a Onda; aclara qué ofrece y cómo darse de baja.",
    };
  }
  return {
    key,
    name,
    language,
    category: "UTILITY",
    description:
      "Aviso de servicio (mantenimiento / cambios importantes). Iniciado por la organización.",
  };
}

/**
 * Lista las 3 plantillas mínimas requeridas para producción.
 * Útil para diagnóstico / health: indica si Meta tiene aprobadas todas.
 */
export function listRequiredTemplates(): Array<{ key: WaTemplateKey; configured: boolean; name: string }> {
  return (
    ["onda_reactivacion", "onda_bienvenida_optin", "onda_aviso_servicio"] as WaTemplateKey[]
  ).map((k) => {
    const c = resolveWaTemplate(k);
    return { key: k, configured: !!c, name: c?.name ?? "" };
  });
}
