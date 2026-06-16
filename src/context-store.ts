import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto de log por request.
 *
 * Mecanismo: un AsyncLocalStorage compartido a nivel de proceso vía el
 * registro global de símbolos (`Symbol.for`). Esto permite que `@smdv/middleware`
 * (que NO depende de logwise) pueble el mismo store sin acoplarse a este paquete:
 * ambos paquetes resuelven la MISMA instancia de ALS a través de la clave global.
 *
 * El middleware de auth abre el contexto al inicio del request con el `ownerId`
 * (clave de tenant, ver ADR-003) y `emit()` lo mezcla en cada línea de log
 * automáticamente — sin tocar las llamadas `logger.*` de cada servicio.
 *
 * En Kafka/jobs sin request inbound el store queda vacío y los campos
 * simplemente no aparecen (comportamiento correcto).
 */
export type LogContext = Record<string, string | number | boolean | undefined>;

const STORE_KEY = Symbol.for('@smdv/log-context');

function getStore(): AsyncLocalStorage<LogContext> {
  const g = globalThis as unknown as Record<symbol, AsyncLocalStorage<LogContext>>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new AsyncLocalStorage<LogContext>();
  }
  return g[STORE_KEY];
}

/**
 * Ejecuta `fn` con un contexto de log activo. Hereda el contexto padre si
 * existe (merge), así que se puede anidar sin perder campos previos.
 */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  const store = getStore();
  const parent = store.getStore();
  const merged: LogContext = { ...(parent || {}), ...context };
  return store.run(merged, fn);
}

/** Devuelve el contexto de log activo (o undefined fuera de un request). */
export function getLogContext(): LogContext | undefined {
  return getStore().getStore();
}

/**
 * Agrega/actualiza campos en el contexto activo sin abrir uno nuevo.
 * No hace nada si no hay contexto activo.
 */
export function setLogContext(context: LogContext): void {
  const current = getStore().getStore();
  if (current) Object.assign(current, context);
}
