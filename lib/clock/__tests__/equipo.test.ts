/* Clock_r — el resumen del equipo: lo que alimenta el panel de administración.

   LA DECISIÓN QUE LO DEFINE: la lista se construye desde LAS PERSONAS, no desde los asientos. Si
   se construyera desde los asientos, quien no ha fichado en toda la semana desaparecería del
   panel — y esa es precisamente la persona que hay que ver. Es el mismo principio que hace que
   `compileRange` enumere fechas en vez de datos: lo que falta es lo que hay que enseñar. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teamSummary } from '../equipo.ts';

const SEMANA = {
  mon: 480, tue: 480, wed: 480, thu: 480, fri: 480, sat: 0, sun: 0,
};

const persona = (id: string, nombre: string) => ({
  id,
  display_name: nombre,
  schedules: [{ validFrom: '2000-01-01', weekly: SEMANA }],
});

const ANA = persona('11111111-1111-4111-8111-111111111111', 'Ana');
const JOSEP = persona('22222222-2222-4222-8222-222222222222', 'Josep');

let n = 0;
const asiento = (personId: string, fecha: string, kind: string, hora: string) => ({
  id: `00000000-0000-4000-8000-${String((n += 1)).padStart(12, '0')}`,
  seq: n,
  person_id: personId,
  op: 'record',
  corrects: null,
  reason: null,
  kind,
  occurred_at: `${fecha}T${hora}:00+02:00`,
  recorded_at: `${fecha}T${hora}:00+02:00`,
  work_date: fecha,
});

/* Lunes 2026-07-06 a viernes 10, comprobados contra el calendario. */
const opciones = {
  from: '2026-07-06',
  to: '2026-07-10',
  today: '2026-07-10',
  absences: [],
  holidays: [],
};

test('cada persona recibe su propio saldo, no el de otra', () => {
  const resumen = teamSummary(
    [ANA, JOSEP],
    [
      asiento(ANA.id, '2026-07-10', 'in', '09:00'),
      asiento(ANA.id, '2026-07-10', 'out', '17:00'),
      asiento(JOSEP.id, '2026-07-10', 'in', '09:00'),
      asiento(JOSEP.id, '2026-07-10', 'out', '13:00'),
    ],
    opciones,
  );

  const ana = resumen.find((r) => r.personId === ANA.id);
  const josep = resumen.find((r) => r.personId === JOSEP.id);

  assert.equal(ana?.workedTodayMinutes, 480);
  assert.equal(josep?.workedTodayMinutes, 240);
});

test('quien no ha fichado nada aparece igual, con su defecto', () => {
  /* El test que define la herramienta. Si desapareciera, el panel escondería justo a quien hay que
     mirar, y el error caeria a favor de quien no ficho. */
  const resumen = teamSummary([ANA, JOSEP], [asiento(ANA.id, '2026-07-10', 'in', '09:00')], opciones);

  assert.equal(resumen.length, 2, 'las dos personas tienen que estar');

  const josep = resumen.find((r) => r.personId === JOSEP.id);
  assert.equal(josep?.fichadoHoy, false);
  assert.equal(josep?.workedTodayMinutes, 0);
  // Cinco días laborables de 8 horas sin fichar: 2400 minutos de defecto.
  assert.equal(josep?.balanceMinutes, -2400);
});

test('se sabe quién ha fichado hoy', () => {
  const resumen = teamSummary(
    [ANA, JOSEP],
    [asiento(ANA.id, '2026-07-10', 'in', '09:00'), asiento(JOSEP.id, '2026-07-09', 'in', '09:00')],
    opciones,
  );

  assert.equal(resumen.find((r) => r.personId === ANA.id)?.fichadoHoy, true);
  // Josep fichó ayer, no hoy: en el panel de hoy no cuenta como fichado.
  assert.equal(resumen.find((r) => r.personId === JOSEP.id)?.fichadoHoy, false);
});

test('una jornada abierta hoy se señala', () => {
  const resumen = teamSummary([ANA], [asiento(ANA.id, '2026-07-10', 'in', '09:00')], opciones);

  assert.equal(resumen[0].abiertaHoy, true);
});

test('las incidencias vienen con su día y las más viejas primero', () => {
  /* «Ordenadas por antigüedad» es lo que pide la definición, y sin fecha no habría antigüedad que
     ordenar: es para esto que compileRange la lleva ahora. */
  const resumen = teamSummary(
    [ANA],
    [
      asiento(ANA.id, '2026-07-07', 'in', '09:00'), // martes, sin salida
      asiento(ANA.id, '2026-07-09', 'in', '09:00'), // jueves, sin salida
    ],
    opciones,
  );

  const fechas = resumen[0].incidencias.map((i) => i.workDate);
  assert.ok(fechas.includes('2026-07-07'));
  assert.ok(fechas.includes('2026-07-09'));
  assert.deepEqual([...fechas].sort(), fechas, 'las incidencias no vienen de más vieja a más nueva');
});

test('una fila que no dice de quién es no se le asigna a nadie', () => {
  /* Lo contrario sería repartirla al azar entre personas, y en un registro horario eso es peor que
     perderla: una hora de alguien apareceria en las cuentas de otro. */
  const resumen = teamSummary(
    [ANA],
    [asiento(ANA.id, '2026-07-10', 'in', '09:00'), { ...asiento(ANA.id, '2026-07-10', 'out', '17:00'), person_id: null }],
    opciones,
  );

  assert.equal(resumen[0].abiertaHoy, true, 'la salida huérfana no debería cerrar su jornada');
});

test('sin personas devuelve una lista vacía y no lanza', () => {
  assert.deepEqual(teamSummary([], [], opciones), []);
});
