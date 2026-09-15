import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToOklch } from '../engine/color.ts';
import { SEMANTIC_KEYS, SEMANTIC_HUES, semanticRamps, softScale } from '../engine/semantic.ts';
import { deriveColors } from '../engine/derive.ts';

const hueDistance = (a: number, b: number) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
};

test('hay cuatro semánticos y cada uno conserva su tono declarado', () => {
  const ramps = semanticRamps('#0E9F8C', false, false);
  assert.deepEqual(Object.keys(ramps), [...SEMANTIC_KEYS]);
  for (const key of SEMANTIC_KEYS) {
    const hues = Object.values(ramps[key]).map((hex) => hexToOklch(hex));
    const saturated = hues.filter((c) => c.C > 0.05);
    assert.ok(saturated.length >= 5, `${key}: casi sin croma`);
    for (const c of saturated) {
      assert.ok(hueDistance(c.h, SEMANTIC_HUES[key].h) < 4, `${key}: tono ${c.h}`);
    }
  }
});

test('armonizar cambia los semánticos según el croma del primario', () => {
  assert.notDeepEqual(semanticRamps('#E5117F', true, false), semanticRamps('#E5117F', false, false));
});

test('la escala suave termina exactamente en el color dado y aclara hacia 50', () => {
  const soft = softScale('#99335F');
  assert.equal(soft['200'], '#99335F');
  assert.ok(hexToOklch(soft['50']).L > hexToOklch(soft['100']).L);
  assert.ok(hexToOklch(soft['100']).L > hexToOklch(soft['200']).L);
});

test('derivar: el secundario gira +152° y el acento −42° desde el primario', () => {
  const primary = hexToOklch('#0E9F8C').h;
  const { secondary, accent } = deriveColors('#0E9F8C');
  assert.ok(hueDistance(hexToOklch(secondary).h, primary + 152) < 3);
  assert.ok(hueDistance(hexToOklch(accent).h, primary - 42) < 3);
});
