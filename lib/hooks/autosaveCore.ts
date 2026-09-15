/* Autoguardado — las decisiones, sin React, para poder testearlas en node. El hook que las usa es
   ./useAutosave.ts.

   Antes vivían dos veces, en DeckStudio y FormStudio, con los mismos valores copiados a mano y un
   comentario en cada una avisando de que el arreglo tenía que ir "en las DOS copias a propósito".
   DSMak_r habría sido la tercera (plan de DSMak_r, §5). */

/** `conflict`: otra pestaña guardó antes. Solo lo produce quien pasa `isConflict` (DSMak_r). */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

/** Inactividad tras la última edición antes de guardar. */
export const AUTOSAVE_DELAY = 1400;

/* Tope de reintentos. Sin él, un fallo re-dispara el efecto indefinidamente: con la sesión caducada
   y una pestaña olvidada abierta eran ~2.500 PATCH fallidos por hora, justo cuando el servicio ya
   está degradado. Tres intentos con espera creciente (1,4 s · 2,8 s · 5,6 s) y luego para: el botón
   "Error · reintentar" de la barra reanuda a mano. */
export const AUTOSAVE_MAX_RETRIES = 3;

/** Lo que dura "Guardado ✓" antes de volver a reposo. */
export const SAVED_FLASH_MS = 2000;

/* Cuánto esperar antes del siguiente guardado automático, o `null` si no toca programarlo.
   Un conflicto no se reintenta nunca: guardar otra vez pisaría lo que escribió la otra pestaña, y
   eso lo tiene que decidir la persona. */
export function autosaveDelay(o: {
  enabled: boolean;
  dirty: boolean;
  saving: boolean;
  retries: number;
  state: SaveState;
  delay?: number;
  maxRetries?: number;
}): number | null {
  const { delay = AUTOSAVE_DELAY, maxRetries = AUTOSAVE_MAX_RETRIES } = o;
  if (!o.enabled || !o.dirty || o.saving || o.state === 'conflict') return null;
  if (o.retries >= maxRetries) return null;
  return delay * 2 ** o.retries;
}

/* Tras un guardado fallido. Un conflicto no gasta intentos: no es un fallo que vaya a arreglarse
   solo esperando. */
export function failureOutcome(retries: number, conflict: boolean): { state: 'error' | 'conflict'; retries: number } {
  return conflict ? { state: 'conflict', retries } : { state: 'error', retries: retries + 1 };
}

/* Si cerrar la pestaña perdería algo: cambios que el autoguardado aún no ha escrito, o un guardado
   que falló o chocó con otra pestaña. */
export function hasPendingWork(o: { enabled: boolean; dirty: boolean; state: SaveState }): boolean {
  return (o.dirty && o.enabled) || o.state === 'error' || o.state === 'conflict';
}
