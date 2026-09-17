/* Clock_r — la jornada teórica vigente en una fecha.

   La primera pieza del bloque 2. El saldo de un día pasado tiene que calcularse con la jornada que
   estaba vigente ESE día, no con la de hoy: si alguien pasa de jornada completa a reducida en
   junio, mayo no puede recalcularse solo. De ahí que `schedules` sea un array de tramos con
   `validFrom` y no un horario suelto (plan, §1). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleAt, type ScheduleTramo } from '../calendar.ts';

const completa: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
};

const reducida: ScheduleTramo = {
  validFrom: '2026-06-01',
  weekly: { mon: 360, tue: 360, wed: 360, thu: 360, fri: 360, sat: 0, sun: 0 },
};

test('un día posterior al cambio usa el tramo nuevo', () => {
  assert.equal(scheduleAt([completa, reducida], '2026-07-10'), reducida);
});

test('un día anterior al cambio sigue usando el tramo viejo', () => {
  // Esto es lo que impide que cambiar la jornada reescriba el saldo de los meses ya cerrados.
  assert.equal(scheduleAt([completa, reducida], '2026-03-01'), completa);
});

test('el día exacto del cambio ya usa el tramo nuevo', () => {
  // `validFrom` incluye su propio día: si no, habría un día sin jornada definida en cada cambio.
  assert.equal(scheduleAt([completa, reducida], '2026-06-01'), reducida);
});

test('una fecha anterior a todos los tramos no tiene jornada', () => {
  /* No se inventa una: devolver 0 o el tramo más antiguo daría un saldo calculado sobre algo que
     nadie decidió. Quien llama lo convierte en incidencia. */
  assert.equal(scheduleAt([reducida], '2026-01-15'), null);
});

test('los tramos desordenados dan el mismo resultado que ordenados', () => {
  // Nadie garantiza el orden de un array que vive en una columna JSONB y edita una persona.
  assert.equal(scheduleAt([reducida, completa], '2026-07-10'), reducida);
  assert.equal(scheduleAt([reducida, completa], '2026-03-01'), completa);
});

test('sin tramos no hay jornada, y no lanza', () => {
  assert.equal(scheduleAt([], '2026-07-10'), null);
});
