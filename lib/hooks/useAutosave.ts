'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AUTOSAVE_DELAY,
  AUTOSAVE_MAX_RETRIES,
  SAVED_FLASH_MS,
  autosaveDelay,
  failureOutcome,
  hasPendingWork,
  type SaveState,
} from './autosaveCore';

export type { SaveState };

/* Autoguardado por inactividad, compartido por DeckMak_r, FormMak_r y DSMak_r.

   Qué hace:
   - `dirty` compara el valor actual con la última versión guardada, serializada con JSON.
   - Guarda tras `delay` ms sin cambios, con reintentos y espera creciente (./autosaveCore.ts).
   - Nunca solapa dos guardados: si hay uno en curso, `saveNow` no hace nada. Lo que se edite
     mientras tanto sigue `dirty` y se guarda en la vuelta siguiente.
   - Avisa al cerrar la pestaña con trabajo pendiente (`beforeunload`).

   Qué NO hace, y se queda en cada editor: el `ConfirmModal` de navegación interna (cada uno ya
   tiene `dirty`), qué ocurre cuando todavía no hay id ("Guardar como" de DeckMak_r) y cómo se
   resuelve un conflicto.

   `value` conviene memoizarlo: se serializa cada vez que cambia su identidad. */
export function useAutosave<T>({
  enabled,
  value,
  save,
  delay = AUTOSAVE_DELAY,
  maxRetries = AUTOSAVE_MAX_RETRIES,
  isConflict,
  paused = false,
}: {
  /** Sin esto no se guarda nada (p. ej. DeckMak_r antes de tener id, FormMak_r antes de cargar). */
  enabled: boolean;
  /* En pausa no se guarda, ni solo ni a mano, pero lo pendiente sigue contando para el aviso al
     cerrar. DSMak_r la usa mientras hay errores de validación: el servidor los rechazaría con un 400
     y el autoguardado gastaría sus reintentos en algo que solo arregla el diseñador. */
  paused?: boolean;
  value: T;
  save: (value: T) => Promise<unknown>;
  delay?: number;
  maxRetries?: number;
  /** Qué error es un conflicto de concurrencia: pasa a `conflict` y no se reintenta. */
  isConflict?: (error: unknown) => boolean;
}) {
  const serialized = useMemo(() => JSON.stringify(value), [value]);
  const [savedSnap, setSavedSnap] = useState(serialized);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const savingRef = useRef(false);
  const retriesRef = useRef(0);

  /* El temporizador y los manejadores llaman siempre a lo más reciente sin reiniciarse al teclear. */
  const latest = useRef({ enabled, paused, value, save, isConflict });
  latest.current = { enabled, paused, value, save, isConflict };

  const dirty = serialized !== savedSnap;

  /* `override` guarda un valor que el estado todavía no refleja (p. ej. publicar justo después de
     reescribir el documento, en el mismo evento). */
  const saveNow = useCallback(async (override?: T) => {
    const { enabled, paused, value, save, isConflict } = latest.current;
    if (!enabled || paused || savingRef.current) return;
    const next = override ?? value;
    savingRef.current = true;
    setSaveState('saving');
    try {
      await save(next);
      setSavedSnap(JSON.stringify(next));
      retriesRef.current = 0;
      setSaveState('saved');
    } catch (e) {
      console.error(e);
      const outcome = failureOutcome(retriesRef.current, isConflict?.(e) ?? false);
      retriesRef.current = outcome.retries;
      setSaveState(outcome.state);
    } finally {
      savingRef.current = false;
    }
  }, []);

  /* Reintento manual: reanuda el autoguardado que se detuvo tras agotar los intentos. */
  const retry = useCallback(() => {
    retriesRef.current = 0;
    return saveNow();
  }, [saveNow]);

  /* Tras cargar un documento, o tras guardarlo por otra vía: esta es la versión que ya está en la
     base de datos. Un `conflict` pendiente se da por resuelto (quien llama acaba de recargar lo que
     escribió la otra pestaña); un `error` no, porque recargar no arregla la red. */
  const markSaved = useCallback((saved: T) => {
    setSavedSnap(JSON.stringify(saved));
    setSaveState((s) => (s === 'conflict' ? 'idle' : s));
  }, []);

  useEffect(() => {
    const ms = autosaveDelay({
      enabled,
      dirty,
      saving: savingRef.current,
      retries: retriesRef.current,
      state: saveState,
      delay,
      maxRetries,
      paused,
    });
    if (ms === null) return;
    const t = setTimeout(() => void saveNow(), ms);
    return () => clearTimeout(t);
  }, [serialized, enabled, paused, dirty, saveState, delay, maxRetries, saveNow]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), SAVED_FLASH_MS);
    return () => clearTimeout(t);
  }, [saveState]);

  const pending = hasPendingWork({ enabled, dirty, state: saveState });
  useEffect(() => {
    if (!pending) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [pending]);

  return { saveState, dirty, saveNow, retry, markSaved };
}
