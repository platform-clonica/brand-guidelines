import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { liveSystem } from '../live.ts';

test('en vivo: un sistema válido da tokens del motor y nada que bloquee el guardado', () => {
  const brand = defaultBrand();
  const res = liveSystem({ brand, overrides: {}, configs: {} });
  assert.deepEqual(res.tokens, composeTokens(brand, {}).tokens);
  assert.equal(res.blocking, false);
  assert.equal(res.issues.some((i) => i.level === 'error'), false);
  assert.equal(res.issues.some((i) => i.path === 'engine_version'), false);
});

test('en vivo: breakpoints que se pisan bloquean el guardado y dicen dónde', () => {
  const brand = defaultBrand();
  brand.breakpoints[1] = { ...brand.breakpoints[1], min: 500 };
  const res = liveSystem({ brand, overrides: {}, configs: {} });
  assert.equal(res.blocking, true);
  assert.ok(res.issues.some((i) => i.level === 'error' && i.path === 'brand.breakpoints.1.min'));
});

test('en vivo: un valor que el esquema no admite bloquea, no lanza, y no hay tokens nuevos', () => {
  const brand = defaultBrand();
  brand.breakpoints[0] = { ...brand.breakpoints[0], min: Number.NaN };
  const res = liveSystem({ brand, overrides: {}, configs: {} });
  assert.equal(res.blocking, true);
  assert.equal(res.tokens, null);
  assert.ok(res.issues.some((i) => i.level === 'error' && i.path.startsWith('brand.breakpoints.0')));
});

test('en vivo: un primario que no llega a AA sobre el fondo claro sale como aviso del paso 1, sin bloquear', () => {
  const brand = { ...defaultBrand(), mode: 'light' as const, colors: { primary: '#DDDDDD', secondary: '#333333' } };
  const res = liveSystem({ brand, overrides: {}, configs: {} });
  assert.equal(res.blocking, false);
  const canvas = res.contrast.find((w) => w.kind === 'color-on-canvas');
  assert.ok(canvas);
  const issue = res.issues.find((i) => i.path === 'brand.colors.primary');
  assert.equal(issue?.level, 'warning');
  assert.match(issue?.message ?? '', /AA/);
});

test('en vivo: un ajuste huérfano es aviso, no error', () => {
  const res = liveSystem({ brand: defaultBrand(), overrides: { spacing: { enorme: 99 } }, configs: {} });
  assert.equal(res.blocking, false);
  assert.ok(res.issues.some((i) => i.level === 'warning' && i.path === 'overrides.spacing.enorme'));
});
