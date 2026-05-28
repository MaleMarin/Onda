/**
 * Ejecuta trabajo en background después de devolver la respuesta HTTP.
 *
 * Estrategia:
 *  1. Si `@vercel/functions.waitUntil` está disponible (entorno Vercel), se usa:
 *     la función serverless seguirá ejecutando el trabajo aún después de haber
 *     emitido el 200 al cliente. Es el mecanismo recomendado por Vercel.
 *  2. Como fallback, se hace fire-and-forget con `void p`: la promesa se queja
 *     loud si tira, pero el runtime puede terminarla anticipadamente al cerrar
 *     la respuesta. Aceptable en desarrollo / Node.js largo / preview; documentar
 *     que en producción Vercel sin `waitUntil` el trabajo puede no completarse.
 *
 * Importante: nunca arroja. Cualquier error del trabajo se loguea, no se
 * propaga al webhook (que ya respondió 200).
 */

type WaitUntilFn = (p: Promise<unknown>) => void;

let _waitUntil: WaitUntilFn | undefined;
let _resolved = false;

async function resolveWaitUntil(): Promise<void> {
  if (_resolved) return;
  _resolved = true;
  try {
    const mod = (await import("@vercel/functions").catch(() => null)) as
      | { waitUntil?: WaitUntilFn }
      | null;
    if (mod && typeof mod.waitUntil === "function") {
      _waitUntil = mod.waitUntil;
    }
  } catch {
    /* ignore */
  }
}

/**
 * Encola el trabajo. Devuelve inmediatamente.
 * El trabajo se ejecuta después de la respuesta HTTP.
 */
export async function runInBackground(work: () => Promise<unknown>, label = "wa-bg"): Promise<void> {
  await resolveWaitUntil();
  const p = Promise.resolve()
    .then(work)
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${label}] error en background:`, msg);
    });
  if (_waitUntil) {
    try {
      _waitUntil(p);
      return;
    } catch (e) {
      console.warn(`[${label}] waitUntil falló, fallback fire-and-forget:`, e);
    }
  }
  void p;
}

/** Solo para tests: permitir inyectar mock de waitUntil. */
export function _setWaitUntilForTests(fn: WaitUntilFn | undefined): void {
  _waitUntil = fn;
  _resolved = true;
}
