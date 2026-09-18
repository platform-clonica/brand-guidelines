/* Clock_r — el registro en CSV.

   Es el fichero que acaba en manos de la asesoría laboral o de un inspector, así que lleva LOS
   ASIENTOS, no el resultado: una corrección sale con su motivo y su autor, y el asiento que
   sustituyó sale también, marcado como no vigente. Si solo llevara el total, el registro no podría
   explicarse, que es justo para lo que existe.

   Sigue la convención de CSV del repo (app/forms/api/export): coma, saltos \r\n y comillas solo
   cuando hacen falta. Con una cosa MÁS, que allí no hay: protección contra inyección de fórmulas.
   Un valor que empieza por = + - o @ lo ejecuta Excel al abrirlo, y aquí el motivo lo teclea una
   persona. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCSV } from '../export.ts';

const ANA = '11111111-1111-4111-8111-111111111111';

const asiento = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  seq: n,
  person_id: ANA,
  person_name: 'Ana Ruiz',
  op: 'record',
  corrects: null,
  reason: null,
  kind: 'in',
  occurred_at: '2026-07-10T09:00:00+02:00',
  recorded_at: '2026-07-10T09:00:00+02:00',
  work_date: '2026-07-10',
  mode: 'onsite',
  source: 'app',
  author_person_id: ANA,
  hash: 'abc123',
  ...extra,
});

const opciones = { nombres: { [ANA]: 'Ana Ruiz' }, supersededIds: new Set<string>() };

const lineas = (csv: string) => csv.split('\r\n');

test('lleva cabecera y una fila por asiento', () => {
  const csv = toCSV([asiento(1), asiento(2, { kind: 'out' })], opciones);
  const filas = lineas(csv);

  assert.equal(filas.length, 3, 'cabecera más dos asientos');
  assert.ok(filas[0].includes('dia_jornada'), 'la cabecera nombra las columnas');
});

test('una corrección sale con su motivo y su autor, no solo el resultado', () => {
  const csv = toCSV(
    [
      asiento(1),
      asiento(2, {
        op: 'amend',
        corrects: asiento(1).id,
        reason: 'Olvide fichar la salida',
        kind: 'out',
      }),
    ],
    opciones,
  );

  assert.ok(csv.includes('Olvide fichar la salida'), 'el motivo tiene que estar');
  assert.ok(csv.includes('amend'), 'la operación tiene que estar');
  assert.ok(csv.includes('Ana Ruiz'), 'el autor tiene que estar');
});

test('el asiento sustituido sale igual, marcado como no vigente', () => {
  /* Si desapareciera, el CSV no podría explicar por qué cambió una hora — y esa explicación es lo
     que hace que el registro aguante una revisión. */
  const viejo = asiento(1);
  const csv = toCSV([viejo, asiento(2, { op: 'amend', corrects: viejo.id, reason: 'Corrijo' })], {
    ...opciones,
    supersededIds: new Set([viejo.id]),
  });

  const filas = lineas(csv);
  assert.equal(filas.length, 3, 'el sustituido no se quita');
  /* Se comprueba la COLUMNA, no la palabra: buscar «no» a secas encontraría cualquier palabra que
     la contenga. Las dos últimas columnas son vigente y hash, así que el final de la fila lo fija. */
  assert.ok(filas[1].endsWith(',no,abc123'), 'el sustituido va marcado como no vigente');
  assert.ok(filas[2].endsWith(',sí,abc123'), 'la corrección que lo sustituyó sí es vigente');
});

test('las comillas se escapan doblándolas', () => {
  const csv = toCSV([asiento(1, { reason: 'Dijo "hasta luego"', op: 'amend', corrects: 'x' })], opciones);
  assert.ok(csv.includes('"Dijo ""hasta luego"""'), 'las comillas van dobladas dentro de comillas');
});

test('una coma en el motivo no parte la columna', () => {
  const csv = toCSV([asiento(1, { reason: 'Salí antes, tenía médico', op: 'amend', corrects: 'x' })], opciones);
  const fila = lineas(csv)[1];

  assert.ok(fila.includes('"Salí antes, tenía médico"'), 'el motivo va entre comillas');
  /* Y la estructura aguanta: si la coma hubiera partido el campo, las columnas de después se
     habrían corrido y la fila no acabaría en vigente y hash. Contar comas no sirve con campos
     entrecomillados; mirar el final de la fila sí. */
  assert.ok(fila.endsWith(',sí,abc123'), 'las columnas de después siguen en su sitio');
});

test('un salto de línea en el motivo no parte la fila', () => {
  const csv = toCSV([asiento(1, { reason: 'Primera\nSegunda', op: 'amend', corrects: 'x' })], opciones);
  assert.ok(csv.includes('"Primera\nSegunda"'), 'el salto va dentro de comillas');
});

test('un motivo que empieza por igual no se ejecuta al abrirlo en Excel', () => {
  /* Inyección de fórmulas. Sin esto, escribir =HYPERLINK(...) como motivo de una corrección
     convierte el registro horario en un vector de ataque contra quien lo abra — y eso incluye a la
     asesoría y al inspector. Se neutraliza con un apóstrofo delante. */
  const csv = toCSV([asiento(1, { reason: '=HYPERLINK("http://malo","clic")', op: 'amend', corrects: 'x' })], opciones);

  assert.ok(!csv.includes(',=HYPERLINK'), 'no puede quedar una celda que empiece por =');
  assert.ok(csv.includes("'=HYPERLINK"), 'se neutraliza con un apóstrofo');
});

test('los otros tres caracteres peligrosos también se neutralizan', () => {
  for (const peligro of ['+1+1', '-1+1', '@SUM(A1)']) {
    const csv = toCSV([asiento(1, { reason: peligro, op: 'amend', corrects: 'x' })], opciones);
    assert.ok(csv.includes(`'${peligro}`), `${peligro} tendría que llevar apóstrofo`);
  }
});

test('una fila ilegible se descarta y no lanza', () => {
  assert.doesNotThrow(() => toCSV([null, 'vaya', 42, asiento(1)], opciones));
  assert.equal(lineas(toCSV([null, asiento(1)], opciones)).length, 2, 'cabecera más el asiento bueno');
});

test('sin asientos devuelve solo la cabecera', () => {
  assert.equal(lineas(toCSV([], opciones)).length, 1);
});
