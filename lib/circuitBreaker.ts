import { kv } from "@vercel/kv";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export type ProviderName = "openai-mini" | "openai-gpt4o" | "anthropic" | "gemini";

export interface CircuitStatus {
  state: CircuitState;
  failures: number;
  lastFailureAt: string | null;
  openedAt: string | null;
  halfOpenProbes?: number;
}

const CIRCUIT_CONFIG = {
  failureThreshold: 3,
  recoveryTimeMs: 60_000,
  halfOpenMaxCalls: 1,
} as const;

const CIRCUIT_TTL_SEC = 600; // 10 minutos

function kvKey(provider: ProviderName): string {
  return `circuit:${provider}`;
}

function initialStatus(): CircuitStatus {
  return {
    state: "CLOSED",
    failures: 0,
    lastFailureAt: null,
    openedAt: null,
    halfOpenProbes: 0,
  };
}

async function loadKv(provider: ProviderName): Promise<CircuitStatus | null> {
  try {
    const raw = await kv.get<string>(kvKey(provider));
    if (raw == null || raw === "") return null;
    const parsed = JSON.parse(raw) as Partial<CircuitStatus>;
    return {
      ...initialStatus(),
      ...parsed,
      halfOpenProbes: parsed.halfOpenProbes ?? 0,
    };
  } catch {
    return null;
  }
}

async function saveKv(provider: ProviderName, s: CircuitStatus): Promise<void> {
  try {
    await kv.set(kvKey(provider), JSON.stringify(s), { ex: CIRCUIT_TTL_SEC });
  } catch {
    /* fail-open: no bloquear el bot */
  }
}

/**
 * Lee el estado del circuit breaker de un proveedor.
 * Si state es OPEN y pasó recoveryTimeMs → pasa a HALF_OPEN y persiste.
 */
export async function getCircuitStatus(provider: ProviderName): Promise<CircuitStatus> {
  try {
    let s = (await loadKv(provider)) ?? initialStatus();
    if (s.state === "OPEN" && s.openedAt) {
      const elapsed = Date.now() - new Date(s.openedAt).getTime();
      if (elapsed > CIRCUIT_CONFIG.recoveryTimeMs) {
        s = { ...s, state: "HALF_OPEN", halfOpenProbes: 0 };
        await saveKv(provider, s);
      }
    }
    return s;
  } catch {
    return initialStatus();
  }
}

/**
 * CLOSED → sí; HALF_OPEN → sí si aún cabe una prueba; OPEN → no.
 * Fail-open si falla KV.
 */
export async function canCall(provider: ProviderName): Promise<boolean> {
  try {
    const s = await getCircuitStatus(provider);
    if (s.state === "CLOSED") return true;
    if (s.state === "HALF_OPEN")
      return (s.halfOpenProbes ?? 0) < CIRCUIT_CONFIG.halfOpenMaxCalls;
    return false;
  } catch {
    return true;
  }
}

/**
 * Reserva hueco en HALF_OPEN (media llamada de prueba). Usar antes de streams largos.
 * Si no puede llamar, lanza CircuitOpenError.
 */
export async function beginProviderCall(provider: ProviderName): Promise<void> {
  if (!(await canCall(provider))) throw new CircuitOpenError(provider);
  const s = await getCircuitStatus(provider);
  if (s.state === "HALF_OPEN") {
    const nextProbes = (s.halfOpenProbes ?? 0) + 1;
    if (nextProbes > CIRCUIT_CONFIG.halfOpenMaxCalls) throw new CircuitOpenError(provider);
    await saveKv(provider, { ...s, halfOpenProbes: nextProbes });
  }
}

export async function recordFailure(provider: ProviderName): Promise<CircuitStatus> {
  try {
    let s = await getCircuitStatus(provider);
    if (s.state === "HALF_OPEN") {
      s = {
        ...s,
        state: "OPEN",
        failures: CIRCUIT_CONFIG.failureThreshold,
        openedAt: new Date().toISOString(),
        lastFailureAt: new Date().toISOString(),
        halfOpenProbes: 0,
      };
      await saveKv(provider, s);
      return s;
    }
    const failures = s.failures + 1;
    const lastFailureAt = new Date().toISOString();
    let state: CircuitState = s.state;
    let openedAt = s.openedAt;
    if (failures >= CIRCUIT_CONFIG.failureThreshold) {
      state = "OPEN";
      openedAt = lastFailureAt;
    }
    s = { ...s, failures, lastFailureAt, state, openedAt, halfOpenProbes: 0 };
    await saveKv(provider, s);
    return s;
  } catch {
    return initialStatus();
  }
}

export async function recordSuccess(provider: ProviderName): Promise<void> {
  try {
    const next: CircuitStatus = {
      state: "CLOSED",
      failures: 0,
      lastFailureAt: null,
      openedAt: null,
      halfOpenProbes: 0,
    };
    await saveKv(provider, next);
  } catch {
    /* */
  }
}

export async function withCircuitBreaker<T>(provider: ProviderName, fn: () => Promise<T>): Promise<T> {
  await beginProviderCall(provider);
  try {
    const result = await fn();
    await recordSuccess(provider);
    return result;
  } catch (e) {
    await recordFailure(provider);
    throw e;
  }
}

export class CircuitOpenError extends Error {
  constructor(public provider: ProviderName) {
    super(`Circuit breaker OPEN para ${provider}`);
    this.name = "CircuitOpenError";
    Object.setPrototypeOf(this, CircuitOpenError.prototype);
  }
}
