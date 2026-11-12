/* Lo que se guarda de una pieza social, sin tocar Supabase.
   ─────────────────────────────────────────────────────────────────────────
   Mismo reparto que `lib/ds/__tests__/server.test.ts`: la lógica vive en
   `lib/social/server.ts` y las rutas de API solo la llaman, así que esto se
   ejercita en node y cubre lo que de verdad decide qué entra en la base de
   datos. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDuplicate,
  buildInsert,
  buildPatch,
  contarSlides,
  isUuid,
  listItemFrom,
  NOMBRE_POR_DEFECTO,
  type SocialPostRow,
} from '../server.ts';
import { templateById } from '../templates.ts';

const FILA: SocialPostRow = {
  id: '11111111-1111-4111-8111-111111111111',
  public_id: 'soc_abc',
  name: 'Comercio agéntico',
  canvas: 'carrusel',
  md: '[ly: titular]\n\n# Una\n\n---\n\n[ly: titular]\n\n# Dos',
  tags: ['miradas'],
  created_at: '2026-11-12T10:00:00Z',
  updated_at: '2026-11-12T10:00:00Z',
};

test('contarSlides no cuenta los bloques vacíos', () => {
  assert.equal(contarSlides('# Una'), 1);
  assert.equal(contarSlides('# Una\n\n---\n\n# Dos'), 2);
  /* Borrar una slide del medio y dejarse el separador no debe sumar una. */
  assert.equal(contarSlides('# Una\n\n---\n\n\n\n---\n\n# Dos'), 2);
  assert.equal(contarSlides(''), 0);
  assert.equal(contarSlides(FILA.md), 2);
});

test('una pieza nueva arranca con la plantilla de Miradas', () => {
  const nueva = buildInsert({});
  assert.equal(nueva.name, NOMBRE_POR_DEFECTO);
  assert.equal(nueva.canvas, 'carrusel');
  assert.equal(nueva.md, templateById('miradas').md);
  assert.deepEqual(nueva.tags, []);
});

test('el lienzo solo puede ser uno de los dos', () => {
  assert.equal(buildInsert({ canvas: 'post' }).canvas, 'post');
  assert.equal(buildInsert({ canvas: 'cualquier-cosa' }).canvas, 'carrusel');
  assert.equal(buildInsert({ canvas: 42 }).canvas, 'carrusel');
});

test('el nombre se limpia y nunca queda vacío', () => {
  assert.equal(buildInsert({ name: '   ' }).name, NOMBRE_POR_DEFECTO);
  assert.equal(buildInsert({ name: '  Hola  ' }).name, 'Hola');
  assert.equal(buildInsert({ name: 'x'.repeat(400) }).name.length, 200);
});

test('las etiquetas se desduplican y se recortan', () => {
  assert.deepEqual(buildInsert({ tags: ['a', 'a', ' b ', '', 3] }).tags, ['a', 'b']);
  assert.equal(buildInsert({ tags: Array.from({ length: 30 }, (_, i) => `t${i}`) }).tags.length, 12);
  assert.deepEqual(buildInsert({ tags: 'no es una lista' }).tags, []);
});

test('una copia lleva el mismo markdown y un nombre distinto', () => {
  const copia = buildDuplicate(FILA, {});
  assert.equal(copia.md, FILA.md);
  assert.equal(copia.name, 'Comercio agéntico (copia)');
  assert.deepEqual(copia.tags, FILA.tags);
  /* Dos filas con el mismo nombre en la galería son indistinguibles. */
  assert.notEqual(copia.name, FILA.name);
});

test('buildPatch solo deja pasar lo que el servidor debe tocar', () => {
  assert.deepEqual(buildPatch({ name: 'Nuevo' }), { name: 'Nuevo' });
  assert.deepEqual(buildPatch({ md: '# x' }), { md: '# x' });
  assert.deepEqual(buildPatch({ canvas: 'post' }), { canvas: 'post' });
  /* Un campo desconocido no es un error de quien escribe: se ignora. */
  assert.equal(buildPatch({ id: 'otro', created_by: 'alguien' }), null);
  assert.equal(buildPatch({}), null, 'sin nada que cambiar no se escribe');
});

test('isUuid rechaza lo que no lo es', () => {
  assert.equal(isUuid(FILA.id), true);
  assert.equal(isUuid('soc_abc'), false);
  assert.equal(isUuid('../../etc/passwd'), false);
});

test('la galería recibe el markdown y el número de slides', () => {
  const item = listItemFrom(FILA);
  assert.equal(item.slides, 2);
  assert.equal(item.md, FILA.md, 'la tarjeta pinta la primera slide, así que necesita el texto');
});
