/* Clock_r — compileDay: la jornada resuelta a partir de sus asientos.

   El estado de un día NO se guarda en ninguna parte: se calcula leyendo la serie de asientos de ese
   `work_date`, aplicando las correcciones y descartando los anulados. Por eso esto es el corazón
   del bloque 2 y por eso su invariante principal no es «calcula bien», sino **no lanza nunca**: una
   serie incoherente tiene que producir incidencias, porque un registro horario que revienta al
   abrirlo es peor que uno que dice lo que no cuadra.

   Los asientos entran en snake_case, tal como los devuelve la base de datos, igual que
   `compileSystem` recibe su fila: lo que sale de Postgres no está validado y quien lo abre tiene
   que pasar por aquí. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileDay } from '../compile.ts';
import type { ScheduleTramo } from '../calendar.ts';

const completa: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
};

/* Un asiento tal y como sale de la tabla. Solo se escriben los campos que el cálculo mira; los
   demás (hash, prev_hash, person_email) existen en la fila pero no entran aquí. */
const asiento = (
  seq: number,
  kind: string,
  hora: string,
  extra: Record<string, unknown> = {},
) => ({
  id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
  seq,
  op: 'record',
  corrects: null,
  reason: null,
  kind,
  occurred_at: `2026-07-10T${hora}:00+02:00`,
  work_date: '2026-07-10',
  mode: 'onsite',
  source: 'app',
  ...extra,
});

const opciones = {
  workDate: '2026-07-10',
  schedules: [completa],
  absences: [],
  holidays: [],
};

test('una jornada normal con dos pausas da las horas efectivas correctas', () => {
  /* Entra a las 9, dos pausas (15 min y 60 min) y sale a las 18. Nueve horas de presencia menos
     una hora y cuarto de pausa: 465 minutos efectivos contra 480 teóricos, o sea 15 de menos.
     2026-07-10 es viernes, comprobado. */
  const resultado = compileDay(
    [
      asiento(1, 'in', '09:00'),
      asiento(2, 'break_start', '11:00'),
      asiento(3, 'break_end', '11:15'),
      asiento(4, 'break_start', '14:00'),
      asiento(5, 'break_end', '15:00'),
      asiento(6, 'out', '18:00'),
    ],
    opciones,
  );

  assert.equal(resultado.ok, true, 'una jornada normal no debería dar incidencias');
  assert.deepEqual(resultado.issues, []);
  assert.equal(resultado.day.workedMinutes, 465);
  assert.equal(resultado.day.breakMinutes, 75);
  assert.equal(resultado.day.theoreticalMinutes, 480);
  assert.equal(resultado.day.balanceMinutes, -15);
  assert.equal(resultado.day.open, false);
});
