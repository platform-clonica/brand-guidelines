import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToOklch } from '../engine/color.ts';
import { STEPS, buildRamp, neutralRamp } from '../engine/ramp.ts';

const SAMPLES = ['#0E9F8C', '#E5117F', '#1C1A17', '#F5F2ED', '#99335F', '#2F5FD6', '#FFD400'];

test('la rampa tiene los diez escalones y todos son hex válidos', () => {
  const ramp = buildRamp('#2F5FD6');
  assert.deepEqual(Object.keys(ramp), STEPS.map(String));
  for (const hex of Object.values(ramp)) assert.match(hex, /^#[0-9A-F]{6}$/);
});

test('la rampa del primario por defecto coincide con la del prototipo', () => {
  assert.deepEqual(buildRamp('#0E9F8C'), {
    '50': '#E7FBF6', '100': '#D0F3EB', '200': '#ACE7DA', '300': '#7ED4C4', '400': '#4BBBA8',
    '500': '#0E9F8C', '600': '#008272', '700': '#006558', '800': '#00493F', '900': '#002C26',
  });
});

test('el color de entrada aparece exacto en el escalón de luminosidad más cercana', () => {
  assert.equal(buildRamp('#0E9F8C')['500'], '#0E9F8C');
  assert.equal(buildRamp('#1C1A17')['900'], '#1C1A17');
  assert.equal(buildRamp('#f5f2ed')['50'], '#F5F2ED');
});

test('la luminosidad decrece estrictamente de 50 a 900, con y sin alto contraste', () => {
  for (const hex of SAMPLES) {
    for (const highContrast of [false, true]) {
      const ramp = buildRamp(hex, { highContrast });
      const Ls = STEPS.map((s) => hexToOklch(ramp[s]).L);
      for (let i = 1; i < Ls.length; i++) {
        assert.ok(Ls[i] < Ls[i - 1], `${hex} hc=${highContrast}: ${STEPS[i]} no es más oscuro que ${STEPS[i - 1]}`);
      }
    }
  }
});

test('mismos parámetros, misma rampa; los ajustes de variación la cambian', () => {
  assert.deepEqual(buildRamp('#2F5FD6'), buildRamp('#2F5FD6'));
  assert.notDeepEqual(buildRamp('#2F5FD6', { chromaBoost: 1.2, hueShift: 4 }), buildRamp('#2F5FD6'));
  assert.deepEqual(
    buildRamp('#2F5FD6', { chromaBoost: 1.2, hueShift: 4 }),
    buildRamp('#2F5FD6', { chromaBoost: 1.2, hueShift: 4 }),
  );
});

test('neutros: el gris puro no tiene croma y el tinte sigue el tono del primario', () => {
  for (const hex of Object.values(neutralRamp('pure', '#E5117F', false))) {
    assert.ok(hexToOklch(hex).C < 0.002, `${hex} tiene croma`);
  }
  const primaryHue = hexToOklch('#2F5FD6').h;
  const tinted = hexToOklch(neutralRamp('primary-tint', '#2F5FD6', false)['500']);
  assert.ok(Math.abs(tinted.h - primaryHue) < 6, `tono ${tinted.h} frente a ${primaryHue}`);
});

test('neutros: el preset cálido y el frío tiran hacia tonos distintos', () => {
  const warm = hexToOklch(neutralRamp('warm', '#0E9F8C', false)['500']).h;
  const cool = hexToOklch(neutralRamp('cool', '#0E9F8C', false)['500']).h;
  assert.ok(Math.abs(warm - 70) < 10, `cálido ${warm}`);
  assert.ok(Math.abs(((cool + 360) % 360) - 250) < 10, `frío ${cool}`);
});
