/* IMG_r — «en uso». La definición vive en SQL (`public.image_uses`); esto es cómo se lee su respuesta:
   una fila por documento, agrupadas por imagen. De aquí salen el recuento de la tarjeta, la lista del
   detalle y la regla que bloquea el borrado, así que las tres dicen lo mismo. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupUses } from '../usage.ts';

const A = '3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6f';
const B = '8d1c2b3a-4e5f-4a6b-9c7d-0e1f2a3b4c5d';
const DECK = '11111111-1111-4111-8111-111111111111';
const FORM = '22222222-2222-4222-8222-222222222222';

test('agrupa los usos por imagen, con tipo, id y nombre del documento', () => {
  const uses = groupUses([
    { image_id: A, kind: 'deck', doc_id: DECK, doc_name: 'Propuesta Hub' },
    { image_id: A, kind: 'form', doc_id: FORM, doc_name: 'Encuesta' },
    { image_id: B, kind: 'deck', doc_id: DECK, doc_name: 'Propuesta Hub' },
  ]);
  assert.deepEqual(uses.get(A), [
    { kind: 'deck', id: DECK, name: 'Propuesta Hub' },
    { kind: 'form', id: FORM, name: 'Encuesta' },
  ]);
  assert.equal(uses.get(B)?.length, 1);
});

test('una imagen sin usos no aparece, y la lista vacía da un mapa vacío', () => {
  assert.equal(groupUses([]).size, 0);
  assert.equal(groupUses(null).size, 0);
});

test('ignora tipos que no conoce en vez de inventar uno', () => {
  const uses = groupUses([{ image_id: A, kind: 'otro', doc_id: DECK, doc_name: 'x' }]);
  assert.equal(uses.size, 0);
});
