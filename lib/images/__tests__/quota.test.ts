import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDIT_LIMIT, quotaKey, remainingEdits, resetDay, resetLabel } from '../quota.ts';

/* La cuota de «Editar con IA»: 25 por persona y mes natural. La clave lleva el mes, así que el
   contador empieza de cero el día 1 sin tocar check_rate_limit. El mes es el de Madrid, no el UTC. */

const USER = '0b6c2a1e-5f1d-4a3b-9c7e-2d8f4e6a1b3c';

test('la clave lleva la persona, el año y el mes', () => {
  assert.equal(quotaKey(USER, new Date('2026-10-15T10:00:00Z')), `imgr-edit:${USER}:2026-10`);
});

test('el 31 a las 23:30 y el 1 a las 00:30, en hora de Madrid, son meses distintos', () => {
  // 31 de octubre de 2026, 23:30 en Madrid (UTC+1) = 22:30 UTC.
  assert.equal(quotaKey(USER, new Date('2026-10-31T22:30:00Z')), `imgr-edit:${USER}:2026-10`);
  // 1 de noviembre, 00:30 en Madrid = 31 de octubre 23:30 UTC: en UTC todavía es octubre.
  assert.equal(quotaKey(USER, new Date('2026-10-31T23:30:00Z')), `imgr-edit:${USER}:2026-11`);
});

test('el contador se reinicia el día 1 del mes siguiente, también al cambiar de año', () => {
  assert.equal(resetDay(new Date('2026-10-02T09:00:00Z')), '2026-11-01');
  assert.equal(resetDay(new Date('2026-12-31T22:30:00Z')), '2027-01-01');
  assert.equal(resetLabel('2026-11-01'), 'el 1 de noviembre');
  assert.equal(resetLabel('2027-01-01'), 'el 1 de enero');
});

test('las que quedan nunca bajan de cero', () => {
  assert.equal(EDIT_LIMIT, 25);
  assert.equal(remainingEdits(0), 25);
  assert.equal(remainingEdits(24), 1);
  assert.equal(remainingEdits(31), 0);
});
