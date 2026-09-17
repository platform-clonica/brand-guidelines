/* Clock_r — lo que deciden las rutas, probado sin HTTP.

   Los handlers de app/api/clock son fontanería: sesión, llamada y respuesta. Lo que se puede
   equivocar vive aquí, en funciones puras, y por eso se puede probar en node. Es el mismo reparto
   que ya usa lib/ds/server.ts, y la razón de que en este repo no haya tests de handler.

   `buildRecordCall` es la validación de la ÚNICA puerta de escritura del libro de asientos, así que
   es el sitio donde más cuesta caro dejar pasar algo. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecordCall } from '../server.ts';

const ok = (resultado: ReturnType<typeof buildRecordCall>) => {
  assert.equal(resultado.ok, true, `esperaba que pasara: ${'error' in resultado ? resultado.error : ''}`);
  return resultado as Extract<typeof resultado, { ok: true }>;
};

const falla = (resultado: ReturnType<typeof buildRecordCall>) => {
  assert.equal(resultado.ok, false, 'esperaba que lo rechazara');
  return resultado as Extract<typeof resultado, { ok: false }>;
};

test('un fichaje normal produce los parámetros de la RPC', () => {
  const resultado = ok(buildRecordCall({ kind: 'in', mode: 'onsite', source: 'home_card' }));

  assert.equal(resultado.params.p_kind, 'in');
  assert.equal(resultado.params.p_mode, 'onsite');
  assert.equal(resultado.params.p_source, 'home_card');
  assert.equal(resultado.params.p_op, 'record');
  assert.equal(resultado.params.p_corrects, null);
  assert.equal(resultado.params.p_reason, null);
});

test('un fichaje normal no lleva hora: la pone el servidor', () => {
  /* ESTE ES EL TEST QUE IMPORTA DE TODO EL FICHERO.

     Si el cliente pudiera elegir la hora de su propio fichaje, cualquiera con sesión ficharía a la
     hora que le conviniera y la cadena de hashes seguiría cuadrando: estaríamos firmando una
     mentira con integridad impecable. El hash prueba que nadie tocó el asiento DESPUÉS, no que el
     dato fuera cierto al escribirlo. Por eso la hora de un fichaje la pone `now()` en el servidor,
     y por eso mandarla es un rechazo y no un campo que se ignora en silencio. */
  const resultado = falla(
    buildRecordCall({
      kind: 'in',
      mode: 'onsite',
      source: 'app',
      occurredAt: '2026-07-10T06:00:00+02:00',
    }),
  );

  assert.equal(resultado.status, 400);
});

test('el servidor no recibe hora en un fichaje normal', () => {
  const resultado = ok(buildRecordCall({ kind: 'out', mode: 'remote', source: 'app' }));

  // `null` significa «ponla tú»: es la función de Postgres la que resuelve now().
  assert.equal(resultado.params.p_occurred_at, null);
});

test('una corrección sí trae su hora, con motivo y asiento corregido', () => {
  /* Corregir es exactamente decir otra hora, así que aquí la hora viene del cliente por necesidad.
     Lo que la hace admisible no es que sea de fiar, es que queda anotada con su autor y su motivo y
     el asiento original sigue a la vista. */
  const resultado = ok(
    buildRecordCall({
      kind: 'out',
      mode: 'onsite',
      source: 'app',
      op: 'amend',
      corrects: '11111111-1111-4111-8111-111111111111',
      reason: 'Olvide fichar la salida',
      occurredAt: '2026-07-10T17:00:00+02:00',
    }),
  );

  assert.equal(resultado.params.p_op, 'amend');
  assert.equal(resultado.params.p_corrects, '11111111-1111-4111-8111-111111111111');
  assert.equal(resultado.params.p_reason, 'Olvide fichar la salida');
  assert.equal(resultado.params.p_occurred_at, '2026-07-10T17:00:00+02:00');
});

test('una corrección sin motivo se rechaza antes de llegar a la base de datos', () => {
  // La restricción de tabla también lo impide; esto es para poder decirlo en castellano y con un 400.
  const resultado = falla(
    buildRecordCall({
      kind: 'out',
      mode: 'onsite',
      source: 'app',
      op: 'amend',
      corrects: '11111111-1111-4111-8111-111111111111',
      occurredAt: '2026-07-10T17:00:00+02:00',
    }),
  );

  assert.equal(resultado.status, 400);
});

test('una corrección sin hora se rechaza', () => {
  const resultado = falla(
    buildRecordCall({
      kind: 'out',
      mode: 'onsite',
      source: 'app',
      op: 'amend',
      corrects: '11111111-1111-4111-8111-111111111111',
      reason: 'Corrijo la salida',
    }),
  );

  assert.equal(resultado.status, 400);
});

test('un tipo de fichaje que no existe se rechaza', () => {
  assert.equal(falla(buildRecordCall({ kind: 'almuerzo', mode: 'onsite', source: 'app' })).status, 400);
});

test('una modalidad que no existe se rechaza', () => {
  assert.equal(falla(buildRecordCall({ kind: 'in', mode: 'teletrabajo', source: 'app' })).status, 400);
});

test('un cuerpo que no es un objeto se rechaza sin lanzar', () => {
  for (const cuerpo of [null, 'vaya', 42, []]) {
    assert.equal(falla(buildRecordCall(cuerpo)).status, 400, `con ${JSON.stringify(cuerpo)}`);
  }
});
