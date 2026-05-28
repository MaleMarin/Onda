/**
 * Guarda de ventana de 24 h para envíos a WhatsApp.
 *
 * Política de Meta: dentro de la ventana de 24 h desde el último mensaje
 * entrante del usuario, podemos enviar texto libre. Fuera de la ventana,
 * SOLO se permiten plantillas HSM aprobadas. Si intentamos texto libre
 * fuera de ventana, Meta lo rechaza con error 131026 (o similar).
 *
 * Esta función crea un "sender" cerrado que recuerda si ya se intentó la
 * plantilla en este turno (para no spamear al usuario con varias
 * reactivaciones por un solo mensaje).
 */

import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "./whatsapp";
import { isWindowActive } from "./waCompliance";
import { resolveWaTemplate } from "./waTemplates";
import { logWaInfo, logWaWarn } from "./waSafeLog";

export type WindowAwareSendResult = { ok: boolean; error?: string };

export type WindowAwareSenderOpts = {
  /** Override para tests: función custom que decide si la ventana está activa. */
  isWindowActiveFn?: (phone: string) => Promise<boolean>;
  /** Override para tests: enviar texto. */
  sendTextFn?: typeof sendWhatsAppText;
  /** Override para tests: enviar template. */
  sendTemplateFn?: typeof sendWhatsAppTemplate;
};

/**
 * Devuelve una función `sendText(text)` que respeta la ventana de 24 h.
 *  - Ventana activa: envía el texto.
 *  - Ventana cerrada (1ª llamada del turno): intenta la plantilla de reactivación
 *    si está configurada; si no, registra evento y NO envía nada.
 *  - Ventana cerrada (2ª+ llamada del turno): suprime el envío con log.
 */
export function makeWindowAwareSender(
  from: string,
  requestId: string,
  opts: WindowAwareSenderOpts = {}
): (text: string) => Promise<WindowAwareSendResult> {
  const isActive = opts.isWindowActiveFn ?? isWindowActive;
  const sendText = opts.sendTextFn ?? sendWhatsAppText;
  const sendTemplate = opts.sendTemplateFn ?? sendWhatsAppTemplate;
  let templateAttempted = false;

  return async function send(text: string): Promise<WindowAwareSendResult> {
    const t = (text ?? "").toString();
    if (!t.trim()) return { ok: false, error: "empty" };
    const windowOpen = from === "unknown" ? true : await isActive(from);
    if (windowOpen) {
      return sendText(from, t);
    }
    if (templateAttempted) {
      logWaWarn("ventana cerrada; mensaje libre suprimido tras intento de template", {
        requestId,
        phone: from,
        extra: { textLen: t.length },
      });
      return { ok: false, error: "window-closed-template-already-sent" };
    }
    templateAttempted = true;
    const tpl = resolveWaTemplate("onda_reactivacion");
    if (!tpl) {
      logWaWarn("ventana cerrada y sin template de reactivación configurado; mensaje suprimido", {
        requestId,
        phone: from,
        extra: { textLen: t.length, env: "WHATSAPP_TEMPLATE_REACTIVATION" },
      });
      return { ok: false, error: "window-closed-no-template" };
    }
    logWaInfo("ventana cerrada; enviando template de reactivación", {
      requestId,
      phone: from,
      extra: { template: tpl.name, language: tpl.language },
    });
    const r = await sendTemplate(from, tpl.name, [], tpl.language);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  };
}
