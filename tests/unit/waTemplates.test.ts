import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getDefaultTemplateLanguage, listRequiredTemplates, resolveWaTemplate } from "@/lib/waTemplates";

const ORIG = {
  reactivation: process.env.WHATSAPP_TEMPLATE_REACTIVATION,
  optin: process.env.WHATSAPP_TEMPLATE_WELCOME_OPTIN,
  service: process.env.WHATSAPP_TEMPLATE_SERVICE_NOTICE,
  lang: process.env.WHATSAPP_TEMPLATE_LANGUAGE,
};

beforeEach(() => {
  delete process.env.WHATSAPP_TEMPLATE_REACTIVATION;
  delete process.env.WHATSAPP_TEMPLATE_WELCOME_OPTIN;
  delete process.env.WHATSAPP_TEMPLATE_SERVICE_NOTICE;
  delete process.env.WHATSAPP_TEMPLATE_LANGUAGE;
});

afterEach(() => {
  process.env.WHATSAPP_TEMPLATE_REACTIVATION = ORIG.reactivation ?? "";
  process.env.WHATSAPP_TEMPLATE_WELCOME_OPTIN = ORIG.optin ?? "";
  process.env.WHATSAPP_TEMPLATE_SERVICE_NOTICE = ORIG.service ?? "";
  process.env.WHATSAPP_TEMPLATE_LANGUAGE = ORIG.lang ?? "";
});

describe("waTemplates", () => {
  it("sin env configurado: resolveWaTemplate devuelve null (no inventamos nombres)", () => {
    expect(resolveWaTemplate("onda_reactivacion")).toBeNull();
    expect(resolveWaTemplate("onda_bienvenida_optin")).toBeNull();
    expect(resolveWaTemplate("onda_aviso_servicio")).toBeNull();
  });

  it("con env configurado devuelve la configuración con nombre EXACTO de Meta", () => {
    process.env.WHATSAPP_TEMPLATE_REACTIVATION = "onda_reactivacion_v1";
    process.env.WHATSAPP_TEMPLATE_LANGUAGE = "es_AR";
    const cfg = resolveWaTemplate("onda_reactivacion");
    expect(cfg).not.toBeNull();
    expect(cfg?.name).toBe("onda_reactivacion_v1");
    expect(cfg?.language).toBe("es_AR");
    expect(cfg?.category).toBe("UTILITY");
  });

  it("idioma por defecto es 'es'", () => {
    expect(getDefaultTemplateLanguage()).toBe("es");
  });

  it("listRequiredTemplates reporta cuáles faltan (para diagnóstico operativo)", () => {
    process.env.WHATSAPP_TEMPLATE_REACTIVATION = "onda_reactivacion_v1";
    const list = listRequiredTemplates();
    expect(list).toHaveLength(3);
    expect(list.find((t) => t.key === "onda_reactivacion")?.configured).toBe(true);
    expect(list.find((t) => t.key === "onda_bienvenida_optin")?.configured).toBe(false);
    expect(list.find((t) => t.key === "onda_aviso_servicio")?.configured).toBe(false);
  });
});
