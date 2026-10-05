import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextHold, type HoldEvent } from '../hold.ts';

/* «Mantén pulsado para ver el original» (F9). Al pulsar, el botón pasa a decir «Original» y encoge: el puntero
   queda fuera y el navegador lanza pointerleave. Si ese evento suelta, la comparación dura un instante
   (pasó en la verificación de la fase 2). Cada gesto suelta solo con su propio final. */

const p = (type: 'pointerdown' | 'pointerup' | 'pointerleave' | 'pointercancel', pointerId = 1): HoldEvent => ({ type, pointerId });
const k = (type: 'keydown' | 'keyup' | 'blur'): HoldEvent => ({ type });

test('pulsar con el puntero o con el teclado enseña el original', () => {
  assert.deepEqual(nextHold(null, p('pointerdown', 7)), { pointer: 7 });
  assert.equal(nextHold(null, k('keydown')), 'key');
});

test('con el puntero, suelta al levantar, al salir o si el sistema cancela el gesto', () => {
  for (const t of ['pointerup', 'pointerleave', 'pointercancel'] as const) assert.equal(nextHold({ pointer: 7 }, p(t, 7)), null, t);
});

test('otro puntero que sale no suelta: el ratón que queda encima mientras se pulsa con el dedo', () => {
  for (const t of ['pointerup', 'pointerleave', 'pointercancel'] as const) assert.deepEqual(nextHold({ pointer: 7 }, p(t, 1)), { pointer: 7 }, t);
});

test('con el teclado, el puntero que queda fuera al encoger el botón no suelta: solo la tecla', () => {
  for (const t of ['pointerleave', 'pointerup', 'pointercancel'] as const) assert.equal(nextHold('key', p(t)), 'key', t);
  assert.equal(nextHold('key', k('keyup')), null);
});

test('levantar una tecla no suelta una pulsación del puntero', () => {
  assert.deepEqual(nextHold({ pointer: 7 }, k('keyup')), { pointer: 7 });
});

test('perder el foco suelta siempre', () => {
  assert.equal(nextHold({ pointer: 7 }, k('blur')), null);
  assert.equal(nextHold('key', k('blur')), null);
});

test('sin nada pulsado, ningún final cambia nada', () => {
  for (const e of [p('pointerup'), p('pointerleave'), p('pointercancel'), k('keyup'), k('blur')]) assert.equal(nextHold(null, e), null, e.type);
});
