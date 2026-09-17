/* Clock_r — qué día es hoy, y qué semana estoy mirando.

   No es azúcar de presentación: estos tres deciden QUÉ DÍA SE FICHA y QUÉ SEMANA se suma. Un error
   de un día en el inicio de semana desplaza el saldo semanal entero, y un día mal resuelto hace que
   el navegador crea que estás fichando el martes mientras el servidor escribe el asiento en el
   lunes — porque `clock_record` deriva `work_date` en Europe/Madrid, y esto tiene que decir lo
   mismo.

   Fechas comprobadas, no supuestas: 2026-07-10 es viernes y 2026-07-11 sábado (verificadas contra
   el calendario); de ahí sale que el 06 es lunes y el 12 domingo. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthRange, todayIn, weekRange } from '../dates.ts';

/* ─── Qué día es hoy, donde importa ─── */

test('el día se resuelve en Madrid, no en UTC', () => {
  /* 23:30 UTC del 15 de enero son las 00:30 del 16 en Madrid (+01:00 en invierno). Si esto
     devolviera el día UTC, alguien que fichara a medianoche vería su fichaje en el día anterior al
     que el servidor va a escribir. */
  const instante = new Date('2026-01-15T23:30:00Z');
  assert.equal(todayIn('Europe/Madrid', instante), '2026-01-16');
});

test('en verano el desfase es de dos horas y también se aplica', () => {
  // 22:30 UTC del 10 de julio son las 00:30 del 11 en Madrid (+02:00).
  assert.equal(todayIn('Europe/Madrid', new Date('2026-07-10T22:30:00Z')), '2026-07-11');
});

test('a media tarde el día es el mismo en los dos husos', () => {
  assert.equal(todayIn('Europe/Madrid', new Date('2026-07-10T12:00:00Z')), '2026-07-10');
});

/* ─── La semana ─── */

test('la semana de un viernes va de lunes a domingo', () => {
  assert.deepEqual(weekRange('2026-07-10'), { from: '2026-07-06', to: '2026-07-12' });
});

test('la semana de un lunes empieza ese mismo lunes', () => {
  assert.deepEqual(weekRange('2026-07-06'), { from: '2026-07-06', to: '2026-07-12' });
});

test('la semana de un domingo es la que TERMINA ese domingo', () => {
  /* El error clásico. Con la semana empezando en domingo —la convención de otros países— este
     domingo abriría una semana nueva y el saldo semanal cambiaría de golpe el último día. Aquí la
     semana laboral empieza en lunes. */
  assert.deepEqual(weekRange('2026-07-12'), { from: '2026-07-06', to: '2026-07-12' });
});

test('una semana puede cruzar el cambio de mes', () => {
  // 2026-07-01 es miércoles, así que su semana empieza el lunes 29 de junio.
  assert.deepEqual(weekRange('2026-07-01'), { from: '2026-06-29', to: '2026-07-05' });
});

/* ─── El mes ─── */

test('el mes va del día uno al último', () => {
  assert.deepEqual(monthRange('2026-07-10'), { from: '2026-07-01', to: '2026-07-31' });
});

test('un mes de treinta días acaba en treinta', () => {
  assert.deepEqual(monthRange('2026-06-15'), { from: '2026-06-01', to: '2026-06-30' });
});

test('febrero de un año normal acaba en veintiocho', () => {
  assert.deepEqual(monthRange('2026-02-10'), { from: '2026-02-01', to: '2026-02-28' });
});

test('febrero de un año bisiesto acaba en veintinueve', () => {
  // 2028 es bisiesto; 2026 no lo es. Si el cálculo fuera «28 fijo», este test lo caza.
  assert.deepEqual(monthRange('2028-02-10'), { from: '2028-02-01', to: '2028-02-29' });
});

test('diciembre no se desborda al año siguiente', () => {
  assert.deepEqual(monthRange('2026-12-05'), { from: '2026-12-01', to: '2026-12-31' });
});
