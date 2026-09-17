/* Clock_r — qué puede pulsar quien mira la pantalla.

   Es la única lógica pura de «Mi jornada», y no es cosmética: de esto depende que el botón de un
   clic ofrezca «salir» cuando estás dentro y «volver de la pausa» cuando estás en pausa. Si se
   equivoca, la gente ficha lo que no era — y corregir un fichaje cuesta un asiento nuevo con su
   motivo, porque aquí nada se reescribe.

   La primera acción de la lista es la PRINCIPAL: la que la tarjeta de la home pone como botón
   grande. Las demás son secundarias. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableActions } from '../actions.ts';
import { compileDay } from '../compile.ts';
import type { ScheduleTramo } from '../calendar.ts';

const completa: ScheduleTramo = {
  validFrom: '2000-01-01',
  weekly: { mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0 },
};

const asiento = (seq: number, kind: string, hora: string) => ({
  id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
  seq,
  op: 'record',
  corrects: null,
  reason: null,
  kind,
  occurred_at: `2026-07-10T${hora}:00+02:00`,
  recorded_at: `2026-07-10T${hora}:00+02:00`,
  work_date: '2026-07-10',
});

const opciones = { workDate: '2026-07-10', schedules: [completa], absences: [], holidays: [] };
const dia = (...asientos: ReturnType<typeof asiento>[]) => compileDay(asientos, opciones).day;

test('sin fichajes, lo único que se puede hacer es entrar', () => {
  assert.deepEqual(availableActions(dia()), ['in']);
});

test('con la jornada abierta se puede salir o empezar una pausa, y salir va primero', () => {
  /* Salir es la principal porque es lo que más veces se pulsa y lo que más cuesta si se olvida: una
     jornada sin cerrar queda como incidencia y hay que corregirla con motivo. */
  assert.deepEqual(availableActions(dia(asiento(1, 'in', '09:00'))), ['out', 'break_start']);
});

test('con una pausa abierta, lo único que se puede hacer es volver', () => {
  /* Ni salir ni empezar otra pausa: las dos dejarían una pausa abierta dentro del registro, y eso
     es justo lo que produce una incidencia. */
  assert.deepEqual(
    availableActions(dia(asiento(1, 'in', '09:00'), asiento(2, 'break_start', '11:00'))),
    ['break_end'],
  );
});

test('después de volver de la pausa se puede salir otra vez', () => {
  assert.deepEqual(
    availableActions(
      dia(asiento(1, 'in', '09:00'), asiento(2, 'break_start', '11:00'), asiento(3, 'break_end', '11:15')),
    ),
    ['out', 'break_start'],
  );
});

test('con la jornada cerrada se puede volver a entrar', () => {
  // Tantos tramos por día como haga falta: salir a mediodía y volver por la tarde es normal.
  assert.deepEqual(
    availableActions(dia(asiento(1, 'in', '09:00'), asiento(2, 'out', '13:00'))),
    ['in'],
  );
});

test('un día con incidencias sigue ofreciendo algo que pulsar', () => {
  /* Un día roto no puede dejar a nadie sin poder fichar: si la única salida fuera corregir antes,
     alguien se quedaría sin registrar su jornada de hoy por un error de ayer. */
  const roto = dia(asiento(1, 'out', '18:00'), asiento(2, 'in', '09:00'));
  assert.ok(availableActions(roto).length > 0, 'siempre tiene que quedar una acción disponible');
});
