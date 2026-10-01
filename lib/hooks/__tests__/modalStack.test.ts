/* La pila de modales abiertos. Con dos modales a la vez (la subida sobre la galería del popup, la
   edición sobre el detalle), cada uno registraba su propio `keydown` en `document`, sin saber del otro:
   Escape cerraba LOS DOS, y el Tab del de abajo podía sacar el foco del de arriba. La regla (detalle 40
   de IMG_r): solo atiende el teclado el modal de arriba. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createModalStack } from '../modalStack.ts';

test('solo el último en abrirse es el de arriba', () => {
  const s = createModalStack();
  const galeria = {};
  const subida = {};
  s.push(galeria);
  assert.ok(s.isTop(galeria));
  s.push(subida);
  assert.ok(s.isTop(subida));
  assert.ok(!s.isTop(galeria));
});

test('al cerrar el de arriba, el de abajo vuelve a atender', () => {
  const s = createModalStack();
  const a = {};
  const b = {};
  s.push(a);
  s.push(b);
  s.remove(b);
  assert.ok(s.isTop(a));
});

test('cerrar uno de en medio no cambia cuál es el de arriba', () => {
  const s = createModalStack();
  const [a, b, c] = [{}, {}, {}];
  s.push(a);
  s.push(b);
  s.push(c);
  s.remove(b);
  assert.ok(s.isTop(c));
  s.remove(c);
  assert.ok(s.isTop(a));
});

test('una pila vacía no tiene a nadie arriba, y meter dos veces el mismo no lo duplica', () => {
  const s = createModalStack();
  const a = {};
  assert.ok(!s.isTop(a));
  s.push(a);
  s.push(a);
  s.remove(a);
  assert.ok(!s.isTop(a));
});
