import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { tokenDiff } from '../diff.ts';

test('diferencia: sin cambios no hay nada que contar', () => {
  const t = composeTokens(defaultBrand(), {}).tokens;
  assert.deepEqual(tokenDiff(t, structuredClone(t)), []);
});

test('diferencia: cada valor que cambia, con una ruta legible (por clave o nombre, no por índice)', () => {
  const a = composeTokens(defaultBrand(), {}).tokens;
  const b = structuredClone(a);
  b.palette.primary['500'] = '#000000';
  b.typography.find((t) => t.key === 'h1')!.size = 99;
  b.spacing.find((s) => s.name === 'md')!.value = 1;
  assert.deepEqual(tokenDiff(a, b), ['palette.primary.500', 'typography.h1.size', 'spacing.md.value']);
});

test('diferencia: lo que falta o sobra en un lado también cuenta, y no lanza con basura', () => {
  assert.deepEqual(tokenDiff({ a: 1 }, { a: 1, b: 2 }), ['b']);
  assert.deepEqual(tokenDiff({ a: { x: 1 } }, { a: null }), ['a']);
  assert.deepEqual(tokenDiff(null, { a: 1 }), ['']);
});
