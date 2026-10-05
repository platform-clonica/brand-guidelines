import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BULK_MAX, IN_CHUNK, chunk, parseAddTags, parseBulkIds, splitDeletable, tagsOutcome } from '../bulk.ts';
import { TAGS_MAX } from '../naming.ts';

/* Entrega 3: acciones en bloque. Lo que validan y reparten PATCH /api/images/bulk y
   POST /api/images/bulk-delete antes y después de tocar la base de datos. */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('los ids: uuid, sin repetir y en el orden en que llegan', () => {
  assert.deepEqual(parseBulkIds([id(2), id(1), id(2)]), { ok: true, value: [id(2), id(1)] });
});

test('los ids: al menos uno y como mucho BULK_MAX', () => {
  assert.equal(BULK_MAX, 200);
  assert.deepEqual(parseBulkIds([]), { ok: false, error: 'Elige al menos una imagen.' });
  assert.equal(parseBulkIds(Array.from({ length: BULK_MAX }, (_, i) => id(i))).ok, true);
  assert.deepEqual(parseBulkIds(Array.from({ length: BULK_MAX + 1 }, (_, i) => id(i))), {
    ok: false,
    error: 'Como mucho 200 imágenes a la vez.',
  });
});

test('los ids: rechaza lo que no es una lista de uuid', () => {
  for (const bad of [undefined, 'x', [id(1), 'no-es-uuid'], [id(1), 3]]) {
    assert.deepEqual(parseBulkIds(bad), { ok: false, error: 'Identificador no válido.' }, JSON.stringify(bad));
  }
});

test('las etiquetas se normalizan como en la subida, y hace falta al menos una', () => {
  assert.deepEqual(parseAddTags(['Sala de Reuniones', 'sala-de-reuniones', '  Luz ']), { ok: true, value: ['sala-de-reuniones', 'luz'] });
  assert.deepEqual(parseAddTags([' ', '']), { ok: false, error: 'Añade al menos una etiqueta.' });
  assert.deepEqual(parseAddTags('luz'), { ok: false, error: 'Añade al menos una etiqueta.' });
});

test('no se pueden añadir más etiquetas de las que caben en una imagen', () => {
  assert.equal(TAGS_MAX, 10);
  const many = Array.from({ length: TAGS_MAX + 1 }, (_, i) => `t${i}`);
  assert.deepEqual(parseAddTags(many), { ok: false, error: 'Demasiadas etiquetas.' });
});

test('el borrado en bloque separa las libres, las que están en uso y las que ya no existen', () => {
  const rows = [
    { id: id(1), storage_path: 'images/1/light.jpg', original_path: 'images/1/original.jpg', thumb_path: 'images/1/thumb.jpg', prior_original_path: null },
    { id: id(2), storage_path: 'images/2/light.jpg', original_path: null, thumb_path: null, prior_original_path: null },
  ];
  const uses = new Map([[id(2), [{ kind: 'deck' as const, id: 'd', name: 'Deck' }]]]);
  const out = splitDeletable([id(1), id(2), id(3)], rows, uses);
  assert.deepEqual(out.free.map((r) => r.id), [id(1)]);
  assert.deepEqual(out.blocked, [{ id: id(2), uses: uses.get(id(2)) }]);
  assert.deepEqual(out.missing, [id(3)]);
});

test('añadir etiquetas: cuáles ya no existen y cuáles se quedaron sin hueco', () => {
  const before = [
    { id: id(1), tags: ['a'] },
    { id: id(2), tags: Array.from({ length: TAGS_MAX }, (_, i) => `t${i}`) },
    { id: id(3), tags: ['luz', 'sala'] },
  ];
  // id(1) recibe las dos; id(2) estaba llena y no se toca; id(3) ya las tenía y no se toca; id(4) no existe.
  const updated = [{ id: id(1), tags: ['a', 'luz', 'sala'] }];
  const out = tagsOutcome([id(1), id(2), id(3), id(4)], ['luz', 'sala'], before, updated);
  assert.deepEqual(out.missing, [id(4)]);
  assert.deepEqual(out.full, [id(2)]);
});

test('añadir etiquetas: una imagen que solo recibe parte de las nuevas también cuenta como llena', () => {
  const nine = Array.from({ length: TAGS_MAX - 1 }, (_, i) => `t${i}`);
  const out = tagsOutcome([id(1)], ['luz', 'sala'], [{ id: id(1), tags: nine }], [{ id: id(1), tags: [...nine, 'luz'] }]);
  assert.deepEqual(out.full, [id(1)]);
  assert.deepEqual(out.missing, []);
});

/* `.in('id', …)` viaja en la URL de PostgREST: 200 uuid son unos 7,4 KB. Se parten en tandas. */
test('los ids se parten en tandas de IN_CHUNK para las consultas que van por la URL', () => {
  assert.equal(IN_CHUNK, 100);
  const ids = Array.from({ length: 250 }, (_, i) => id(i));
  assert.deepEqual(chunk(ids, IN_CHUNK).map((c) => c.length), [100, 100, 50]);
  assert.deepEqual(chunk([], IN_CHUNK), []);
});
