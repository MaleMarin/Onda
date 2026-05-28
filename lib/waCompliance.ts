/**
 * Cumplimiento WhatsApp Business (Meta): opt-in/opt-out, ventana 24h, primer contacto.
 * Fail-open si KV no está disponible: no bloquear conversaciones.
 */

import { WA_FIRST_CONTACT_PACK } from "@/content/shared";
import { kv } from "@vercel/kv";

const TTL_OPT_OUT_SEC = 2 * 365 * 24 * 60 * 60; // 2 años
const TTL_WINDOW_SEC = 86400; // 24 h

function kvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim());
}

/**
 * Alerta explícita si en producción se intenta usar opt-out / ventana sin KV.
 * No cambia el comportamiento (sigue fail-open para no bloquear conversaciones),
 * pero deja huella en logs para que ops pueda diagnosticar y arreglar el deploy.
 * Se emite por cada operación crítica para que sea visible aún si la
 * instancia se recicla (no usamos singleton: en prod el log es información
 * accionable y no spam ruidoso).
 */
function assertKvForProduction(op: string): void {
  if (kvConfigured()) return;
  if (process.env.NODE_ENV !== "production") return;
  console.error(
    `[waCompliance] PRODUCCIÓN sin Vercel KV configurado (op=${op}). ` +
      `Opt-out, ventana 24 h y primer contacto NO sobreviven cold starts. ` +
      `Configurar KV_REST_API_URL / KV_REST_API_TOKEN en Vercel → Storage.`
  );
}

function phoneKey(phone: string): string {
  const d = String(phone).replace(/\D/g, "");
  return d || String(phone).trim() || "unknown";
}

function keyOptOut(phone: string): string {
  return `wa:optout:${phoneKey(phone)}`;
}
function keyWindow(phone: string): string {
  return `wa:window:${phoneKey(phone)}`;
}
function keySeen(phone: string): string {
  return `wa:seen:${phoneKey(phone)}`;
}

// Palabras que activan el opt-out (case-insensitive, con/sin tildes)
const OPT_OUT_KEYWORDS = [
  "stop",
  "parar",
  "detener",
  "cancelar",
  "salir",
  "basta",
  "no más",
  "no mas",
  "unsubscribe",
  "darme de baja",
];

// Palabras que reactivan (opt-in después de opt-out)
const OPT_IN_KEYWORDS = [
  "hola",
  "inicio",
  "start",
  "comenzar",
  "continuar",
  "activar",
  "suscribir",
  "quiero recibir",
];

function normalizeWaText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function matchesPhrase(norm: string, phrase: string): boolean {
  const p = normalizeWaText(phrase);
  if (p.includes(" ")) {
    return norm.includes(p);
  }
  const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(norm);
}

/**
 * Verifica si el mensaje es una solicitud de opt-out
 */
export function isOptOutMessage(text: string): boolean {
  const norm = normalizeWaText(text);
  if (!norm) return false;
  return OPT_OUT_KEYWORDS.some((k) => matchesPhrase(norm, k));
}

/**
 * Verifica si el mensaje es una solicitud de opt-in
 */
export function isOptInMessage(text: string): boolean {
  const norm = normalizeWaText(text);
  if (!norm) return false;
  return OPT_IN_KEYWORDS.some((k) => matchesPhrase(norm, k));
}

/**
 * Marca el número como opt-out en KV (TTL: 2 años)
 */
export async function setOptOut(phone: string): Promise<void> {
  if (!kvConfigured()) {
    assertKvForProduction("setOptOut");
    console.warn("[waCompliance] KV no configurado; setOptOut omitido.");
    return;
  }
  try {
    await kv.set(keyOptOut(phone), "1", { ex: TTL_OPT_OUT_SEC });
  } catch (e) {
    console.warn("[waCompliance] setOptOut KV error:", e);
  }
}

/**
 * Reactiva el número (borra el opt-out)
 */
export async function setOptIn(phone: string): Promise<void> {
  if (!kvConfigured()) {
    console.warn("[waCompliance] KV no configurado; setOptIn omitido.");
    return;
  }
  try {
    await kv.del(keyOptOut(phone));
  } catch (e) {
    console.warn("[waCompliance] setOptIn KV error:", e);
  }
}

/**
 * Verifica si el número está en opt-out
 */
export async function isOptedOut(phone: string): Promise<boolean> {
  if (!kvConfigured()) {
    assertKvForProduction("isOptedOut");
    return false;
  }
  try {
    const v = await kv.get(keyOptOut(phone));
    return v != null && v !== "";
  } catch (e) {
    console.warn("[waCompliance] isOptedOut KV error (fail-open):", e);
    return false;
  }
}

/**
 * Registra mensaje entrante: abre/renueva ventana de 24 h para respuestas de texto libre
 */
export async function renewMessageWindow(phone: string): Promise<void> {
  if (!kvConfigured()) {
    console.warn("[waCompliance] KV no configurado; renewMessageWindow omitido.");
    return;
  }
  try {
    await kv.set(keyWindow(phone), String(Date.now()), { ex: TTL_WINDOW_SEC });
  } catch (e) {
    console.warn("[waCompliance] renewMessageWindow KV error:", e);
  }
}

/**
 * Si la ventana de 24 h está activa → se puede responder con texto libre (política Meta).
 */
export async function isWindowActive(phone: string): Promise<boolean> {
  if (!kvConfigured()) {
    assertKvForProduction("isWindowActive");
    return true;
  }
  try {
    const ttl = await kv.ttl(keyWindow(phone));
    if (ttl === -2) return false;
    return ttl > 0 || ttl === -1;
  } catch (e) {
    console.warn("[waCompliance] isWindowActive KV error (fail-open activo):", e);
    return true;
  }
}

/**
 * Primera vez que escribimos con este número en KV (sin marca wa:seen)
 */
export async function isFirstContact(phone: string): Promise<boolean> {
  if (!kvConfigured()) return false;
  try {
    const v = await kv.get(keySeen(phone));
    return v == null || v === "";
  } catch (e) {
    console.warn("[waCompliance] isFirstContact KV error (fail-open no primer contacto):", e);
    return false;
  }
}

/**
 * Marca el número como visto (ya no dispara bienvenida de primer contacto)
 */
export async function markAsSeen(phone: string): Promise<void> {
  if (!kvConfigured()) {
    console.warn("[waCompliance] KV no configurado; markAsSeen omitido.");
    return;
  }
  try {
    await kv.set(keySeen(phone), "1");
  } catch (e) {
    console.warn("[waCompliance] markAsSeen KV error:", e);
  }
}

/** Confirmación de baja (voz Onda, español neutro). */
export const WA_OPT_OUT_ACK =
  "Listo: dejas de recibir mis respuestas automáticas. Si en algún momento quieres volver, escribe HOLA, INICIO o CONTINUAR. Cuídate.";

export const WA_OPT_IN_ACK =
  "¡Hola de nuevo! Ya puedes escribirme cuando quieras; sigo siendo Onda de Precisar, para leer la información con más criterio.";

export const WA_OPTED_OUT_NOTICE =
  "Pediste no recibir más mensajes. Para reactivar la conversación, escribe HOLA, INICIO o CONTINUAR.";

/** Bienvenida primer contacto (opt-in implícito: el usuario escribió primero). Texto en `content/shared.ts`. */
export const WA_FIRST_CONTACT_WELCOME = WA_FIRST_CONTACT_PACK;
