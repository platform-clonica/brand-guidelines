import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTokens } from '../engine/generate.ts';
import { defaultBrand } from '../engine/presets.ts';
import { surfaces } from '../engine/surfaces.ts';
import { contrastWarnings } from '../engine/warnings.ts';
import type { Brand } from '../schema.ts';

const warningsFor = (patch: Partial<Brand>) => {
  const brand = { ...defaultBrand(), ...patch };
  return contrastWarnings(generateTokens(brand), brand);
};

test('superficies claras: lienzo neutro 50, superficie blanca y texto neutro 900', () => {
  const t = generateTokens(defaultBrand());
  const s = surfaces(t, 'light');
  assert.equal(s.canvas, t.palette.neutral['50']);
  assert.equal(s.surface, '#FFFFFF');
  assert.equal(s.text, t.palette.neutral['900']);
  assert.equal(s.border, t.palette.neutral['200']);
});

test('superficies oscuras: lienzo neutro 900, texto neutro 50 y una superficie algo más clara', () => {
  const t = generateTokens(defaultBrand());
  const s = surfaces(t, 'dark');
  assert.equal(s.canvas, t.palette.neutral['900']);
  assert.equal(s.text, t.palette.neutral['50']);
  assert.notEqual(s.surface, s.canvas);
});

/* Se mide el primario TAL COMO LO DA EL CLIENTE, no el escalón 500: el 500 de cualquier rampa cae en
   L≈0,63 y nunca llega a 4,5 sobre un fondo casi blanco, así que avisaría siempre y no diría nada. */
test('un primario claro avisa de que no llega a AA sobre el fondo claro', () => {
  const warnings = warningsFor({ mode: 'light', colors: { primary: '#FFD400', secondary: '#2F5FD6' } });
  assert.ok(
    warnings.some((w) => w.kind === 'color-on-canvas' && w.path === 'colors.primary' && w.mode === 'light'),
    JSON.stringify(warnings),
  );
});

test('un primario oscuro no avisa sobre el fondo claro, pero sí sobre el oscuro', () => {
  const warnings = warningsFor({ mode: 'both', colors: { primary: '#1C1A17', secondary: '#2F5FD6' } });
  assert.ok(!warnings.some((w) => w.kind === 'color-on-canvas' && w.mode === 'light'));
  assert.ok(warnings.some((w) => w.kind === 'color-on-canvas' && w.mode === 'dark'));
});

test('el modo decide qué fondos se comprueban', () => {
  const warnings = warningsFor({ mode: 'light', colors: { primary: '#1C1A17', secondary: '#2F5FD6' } });
  assert.ok(warnings.every((w) => w.mode === 'light'));
});

test('avisa cuando el mejor texto posible sobre un escalón de acción no llega a 4,5', () => {
  const warnings = warningsFor({ mode: 'light', colors: { primary: '#777777', secondary: '#2F5FD6' } });
  const hit = warnings.find((w) => w.kind === 'text-on-swatch' && w.path === 'palette.primary.600');
  assert.ok(hit, JSON.stringify(warnings));
  assert.ok(hit.ratio < 4.5);
});

test('cada aviso lleva su ratio truncado, que nunca aparenta aprobar', () => {
  for (const w of warningsFor({ colors: { primary: '#FFD400', secondary: '#777777' } })) {
    assert.ok(w.ratio < 4.5, `${w.path} ${w.ratio}`);
  }
});
