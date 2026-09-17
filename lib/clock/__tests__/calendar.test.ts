/* Clock_r — la jornada teórica vigente en una fecha.

   La primera pieza del bloque 2. El saldo de un día pasado tiene que calcularse con la jornada que
   estaba vigente ESE día, no con la de hoy: si alguien pasa de jornada completa a reducida en
   junio, mayo no puede recalcularse solo. De ahí que `schedules` sea un array de tramos con
   `validFrom` y no un horario suelto (plan, §1). */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleAt, theoreticalMinutes, type ScheduleTramo } from '../calendar.ts';

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

/* ─── Minutos teóricos de un día concreto ───

   Lo que `scheduleAt` devuelve es una semana tipo; esto la baja a un día, aplicando lo que lo
   vacía: el fin de semana, el festivo y la ausencia. Los tres dan 0 por motivos distintos, y esa
   distinción importa fuera de aquí — un festivo no es lo mismo que una ausencia en el informe que
   se exporta— pero el saldo del día es el mismo: no se debe nada. */

const intensiva: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
  intensive: {
    from: '06-15',
    to: '09-15',
    weekly: { mon: 420, tue: 420, wed: 420, thu: 420, fri: 300, sat: 0, sun: 0 },
  },
};

test('un día laborable debe los minutos de su día de la semana', () => {
  // 2026-07-10 es viernes.
  assert.equal(theoreticalMinutes(completa, '2026-07-10', { holidays: [], absences: [] }), 480);
});

test('un sábado no debe nada', () => {
  // 2026-07-11 es sábado.
  assert.equal(theoreticalMinutes(completa, '2026-07-11', { holidays: [], absences: [] }), 0);
});

test('un festivo no debe nada aunque caiga en día laborable', () => {
  // 2026-08-15 es sábado, así que se usa uno que cae entre semana: el 12 de octubre de 2026 es lunes.
  assert.equal(
    theoreticalMinutes(completa, '2026-10-12', { holidays: ['2026-10-12'], absences: [] }),
    0,
  );
});

test('un día dentro de una ausencia no debe nada', () => {
  assert.equal(
    theoreticalMinutes(completa, '2026-07-10', {
      holidays: [],
      absences: [{ fromDate: '2026-07-06', toDate: '2026-07-17' }],
    }),
    0,
  );
});

test('los extremos de una ausencia entran dentro', () => {
  // Si `toDate` no contara, el último día de vacaciones de todo el mundo saldría como incidencia.
  const ausencia = { holidays: [], absences: [{ fromDate: '2026-07-06', toDate: '2026-07-10' }] };
  assert.equal(theoreticalMinutes(completa, '2026-07-06', ausencia), 0);
  assert.equal(theoreticalMinutes(completa, '2026-07-10', ausencia), 0);
});

test('el día siguiente al final de una ausencia vuelve a deber jornada', () => {
  assert.equal(
    theoreticalMinutes(completa, '2026-07-13', {
      holidays: [],
      absences: [{ fromDate: '2026-07-06', toDate: '2026-07-10' }],
    }),
    480,
  );
});

test('la jornada intensiva manda dentro de su periodo', () => {
  // 2026-07-10, viernes de julio: dentro del 15/06–15/09.
  assert.equal(theoreticalMinutes(intensiva, '2026-07-10', { holidays: [], absences: [] }), 300);
});

test('fuera del periodo intensivo vuelve la jornada normal', () => {
  // 2026-10-09 es viernes, ya fuera del periodo.
  assert.equal(theoreticalMinutes(intensiva, '2026-10-09', { holidays: [], absences: [] }), 480);
});

test('los extremos del periodo intensivo entran dentro', () => {
  // 2026-06-15 es lunes y 2026-09-15 es martes: los dos son días laborables.
  assert.equal(theoreticalMinutes(intensiva, '2026-06-15', { holidays: [], absences: [] }), 420);
  assert.equal(theoreticalMinutes(intensiva, '2026-09-15', { holidays: [], absences: [] }), 420);
});
