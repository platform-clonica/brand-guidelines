import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTOSAVE_DELAY, AUTOSAVE_MAX_RETRIES, autosaveDelay, failureOutcome, hasPendingWork } from '../autosaveCore.ts';

const base = { enabled: true, dirty: true, saving: false, retries: 0, state: 'idle' as const };

test('autoguardado: espera creciente 1400 · 2800 · 5600 y se detiene al tercer fallo', () => {
  assert.equal(AUTOSAVE_DELAY, 1400);
  assert.equal(AUTOSAVE_MAX_RETRIES, 3);
  assert.equal(autosaveDelay({ ...base, retries: 0 }), 1400);
  assert.equal(autosaveDelay({ ...base, retries: 1, state: 'error' }), 2800);
  assert.equal(autosaveDelay({ ...base, retries: 2, state: 'error' }), 5600);
  assert.equal(autosaveDelay({ ...base, retries: 3, state: 'error' }), null);
});

test('autoguardado: no se programa sin cambios, desactivado o con un guardado en curso', () => {
  assert.equal(autosaveDelay({ ...base, dirty: false }), null);
  assert.equal(autosaveDelay({ ...base, enabled: false }), null);
  assert.equal(autosaveDelay({ ...base, saving: true }), null);
});

test('en pausa (p. ej. con errores de validación): no se programa, pero el trabajo sigue pendiente', () => {
  assert.equal(autosaveDelay({ ...base, paused: true }), null);
  assert.equal(hasPendingWork({ enabled: true, dirty: true, state: 'idle' }), true);
});

test('autoguardado: el retraso y el tope se pueden ajustar', () => {
  assert.equal(autosaveDelay({ ...base, retries: 1, delay: 100, maxRetries: 5 }), 200);
  assert.equal(autosaveDelay({ ...base, retries: 1, maxRetries: 1 }), null);
});

test('conflicto: no reintenta y no gasta intentos', () => {
  assert.deepEqual(failureOutcome(1, true), { state: 'conflict', retries: 1 });
  assert.equal(autosaveDelay({ ...base, state: 'conflict' }), null);
  assert.deepEqual(failureOutcome(1, false), { state: 'error', retries: 2 });
});

test('aviso al cerrar: cambios sin guardar con guardado activo, un error o un conflicto', () => {
  assert.equal(hasPendingWork({ enabled: true, dirty: true, state: 'idle' }), true);
  assert.equal(hasPendingWork({ enabled: false, dirty: true, state: 'idle' }), false);
  assert.equal(hasPendingWork({ enabled: true, dirty: false, state: 'idle' }), false);
  assert.equal(hasPendingWork({ enabled: true, dirty: false, state: 'error' }), true);
  assert.equal(hasPendingWork({ enabled: false, dirty: false, state: 'conflict' }), true);
});
