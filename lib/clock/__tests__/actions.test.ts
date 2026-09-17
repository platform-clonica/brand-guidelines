/* Clock_r — qué puede pulsar quien mira la pantalla.

   Es la única lógica pura de «Mi jornada», y no es cosmética: de esto depende que el botón de un
   clic ofrezca «salir» cuando estás dentro y «volver de la pausa» cuando estás en pausa. Si se
   equivoca, la gente ficha lo que no era — y corregir un fichaje cuesta un asiento nuevo con su
   motivo, porque aquí nada se reescribe.

   La primera acción de la lista es la PRINCIPAL: la que la tarjeta de la home pone como botón
   grande. Las demás son secundarias. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { availableActions, correctableEntries } from '../actions.ts';
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

/* ─── Qué se puede corregir ───

   El modo corrección tiene que ofrecer SOLO los asientos que siguen contando. La regla que lo
   sostiene, y que hoy no impide nada: un asiento ya corregido no se vuelve a corregir. Sin ella,
   dos correcciones del mismo original compiten por sustituirlo y el resultado del día pasa a
   depender del orden en que se escribieron. Se corrige el último de la cadena, no el primero.

   Nada de esto borra: corregir escribe un asiento nuevo que apunta al viejo, y el viejo se queda a
   la vista. Lo que cambia es a cuál puedes apuntar. */

const corregir = (seq: number, kind: string, hora: string, op: string, corrects: number) => ({
  ...asiento(seq, kind, hora),
  op,
  corrects: `00000000-0000-4000-8000-${String(corrects).padStart(12, '0')}`,
  reason: 'Motivo de la corrección',
});

const idsDe = (filas: { id: string }[]) => filas.map((f) => Number(f.id.slice(-12)));

test('un fichaje normal se puede corregir', () => {
  const filas = [asiento(1, 'in', '09:00'), asiento(2, 'out', '17:00')];
  assert.deepEqual(idsDe(correctableEntries(filas, compileDay(filas, opciones).day)), [1, 2]);
});

test('un asiento ya corregido no se puede volver a corregir', () => {
  /* El que cuenta es el nuevo. Ofrecer el viejo haría que dos correcciones apuntaran al mismo
     original, y entonces cuál gana depende del orden de escritura. */
  const filas = [asiento(1, 'in', '09:00'), asiento(2, 'out', '18:00'), corregir(3, 'out', '17:00', 'amend', 2)];
  const corregibles = idsDe(correctableEntries(filas, compileDay(filas, opciones).day));

  assert.ok(!corregibles.includes(2), 'el asiento sustituido ya no se corrige');
});

test('la corrección que sustituyó a otro sí se puede corregir', () => {
  // Si la hora corregida también estaba mal, hay que poder volver a corregirla.
  const filas = [asiento(1, 'in', '09:00'), asiento(2, 'out', '18:00'), corregir(3, 'out', '17:00', 'amend', 2)];
  const corregibles = idsDe(correctableEntries(filas, compileDay(filas, opciones).day));

  assert.ok(corregibles.includes(3), 'la corrección vigente es la que se corrige');
});

test('un asiento anulado no se puede corregir', () => {
  const filas = [asiento(1, 'in', '09:00'), asiento(2, 'in', '09:05'), corregir(3, 'in', '09:05', 'annul', 2)];
  const corregibles = idsDe(correctableEntries(filas, compileDay(filas, opciones).day));

  assert.ok(!corregibles.includes(2), 'lo anulado ya no cuenta, así que no hay nada que corregir');
});

test('la anulación tampoco se corrige a sí misma', () => {
  /* Una anulación no aporta hora: se retira ella también del cálculo. Ofrecerla llevaría a corregir
     algo que no está en el día. */
  const filas = [asiento(1, 'in', '09:00'), asiento(2, 'in', '09:05'), corregir(3, 'in', '09:05', 'annul', 2)];
  const corregibles = idsDe(correctableEntries(filas, compileDay(filas, opciones).day));

  assert.ok(!corregibles.includes(3), 'la propia anulación no es corregible');
});

test('sin asientos no hay nada que corregir, y no lanza', () => {
  assert.deepEqual(correctableEntries([], compileDay([], opciones).day), []);
});

test('una fila ilegible no se ofrece para corregir', () => {
  // Lo que compileDay descarta por no poder leerlo tampoco puede ser destino de una corrección.
  const filas = [null, asiento(1, 'in', '09:00')];
  assert.deepEqual(idsDe(correctableEntries(filas, compileDay(filas, opciones).day)), [1]);
});

test('un día con incidencias sigue ofreciendo algo que pulsar', () => {
  /* Un día roto no puede dejar a nadie sin poder fichar: si la única salida fuera corregir antes,
     alguien se quedaría sin registrar su jornada de hoy por un error de ayer. */
  const roto = dia(asiento(1, 'out', '18:00'), asiento(2, 'in', '09:00'));
  assert.ok(availableActions(roto).length > 0, 'siempre tiene que quedar una acción disponible');
});
