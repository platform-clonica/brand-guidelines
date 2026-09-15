import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToOklch, isHex, oklchToHex, parseHex, rgba, toHex } from '../engine/color.ts';

const near = (actual: number, expected: number, tol = 1e-3) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${actual} no está a ${tol} de ${expected}`);

test('parseHex acepta 6 y 3 dígitos, con o sin almohadilla', () => {
  assert.deepEqual(parseHex('#fff'), { r: 1, g: 1, b: 1 });
  assert.deepEqual(parseHex('000000'), { r: 0, g: 0, b: 0 });
  near(parseHex('#0E9F8C')!.g, 0x9f / 255, 1e-9);
});

test('parseHex rechaza lo que no es un color', () => {
  assert.equal(parseHex('#12345'), null);
  assert.equal(parseHex('azul'), null);
  assert.equal(parseHex(''), null);
  assert.equal(isHex('#1C1A17'), true);
  assert.equal(isHex('#1C1A1'), false);
});

test('toHex recorta los canales fuera de rango y devuelve mayúsculas', () => {
  assert.equal(toHex({ r: 1.2, g: -0.1, b: 0.5 }), '#FF0080');
});

test('hexToOklch da los valores de referencia de OKLCH', () => {
  const white = hexToOklch('#FFFFFF');
  near(white.L, 1);
  near(white.C, 0);
  near(hexToOklch('#000000').L, 0);
  const red = hexToOklch('#FF0000');
  near(red.L, 0.62796);
  near(red.C, 0.25768);
  near(red.h, 29.2339, 1e-2);
});

test('ida y vuelta por OKLCH conserva los colores de marca', () => {
  for (const hex of ['#0E9F8C', '#E5117F', '#1C1A17', '#F5F2ED', '#99335F', '#5999A6']) {
    const { L, C, h } = hexToOklch(hex);
    assert.equal(oklchToHex(L, C, h), hex);
  }
});

test('un color fuera de gama se recorta en croma y conserva la luminosidad', () => {
  const hex = oklchToHex(0.7, 0.4, 150);
  assert.match(hex, /^#[0-9A-F]{6}$/);
  const back = hexToOklch(hex);
  assert.ok(back.C < 0.4, `croma ${back.C} sin recortar`);
  near(back.L, 0.7, 0.01);
});

test('rgba compone la cadena CSS con canales enteros', () => {
  assert.equal(rgba('#FF0000', 0.5), 'rgba(255, 0, 0, 0.5)');
});
