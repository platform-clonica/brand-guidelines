import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTokens } from '../engine/index.ts';
import { generateTokens } from '../engine/generate.ts';
import { defaultBrand } from '../engine/presets.ts';
import { buildRamp } from '../engine/ramp.ts';
import type { Brand } from '../schema.ts';

const brandWith = (patch: Partial<Brand>): Brand => ({ ...defaultBrand(), ...patch });

test('sin overrides, componer es lo mismo que generar', () => {
  const { tokens, orphans } = composeTokens(defaultBrand(), {});
  assert.deepEqual(tokens, generateTokens(defaultBrand()));
  assert.deepEqual(orphans, []);
});

test('una muestra editada a mano gana a la del motor, en paleta y en semánticos', () => {
  const { tokens } = composeTokens(defaultBrand(), {
    swatches: { 'palette.primary.500': '#123456', 'semantic.error.600': '#654321', 'semanticScale.info.50': '#FAFAFA' },
  });
  assert.equal(tokens.palette.primary['500'], '#123456');
  assert.equal(tokens.semantic.error['600'], '#654321');
  assert.equal(tokens.semanticScale.info['50'], '#FAFAFA');
});

test('una familia bloqueada no cambia aunque cambie el primario', () => {
  const locked = generateTokens(defaultBrand()).palette.primary;
  const { tokens } = composeTokens(brandWith({ colors: { primary: '#D6246B', secondary: '#2F5FD6' } }), {
    locks: { primary: locked },
  });
  assert.deepEqual(tokens.palette.primary, locked);
});

test('el bloqueo gana a una muestra editada de la misma familia', () => {
  const locked = generateTokens(defaultBrand()).palette.primary;
  const { tokens } = composeTokens(defaultBrand(), {
    locks: { primary: locked },
    swatches: { 'palette.primary.500': '#123456' },
  });
  assert.equal(tokens.palette.primary['500'], locked['500']);
});

test('la variación guardada reproduce siempre la misma rampa', () => {
  const tweak = { chromaBoost: 1.17, hueShift: -3.4 };
  const a = composeTokens(defaultBrand(), { rampTweaks: { secondary: tweak } }).tokens.palette.secondary;
  const b = composeTokens(defaultBrand(), { rampTweaks: { secondary: tweak } }).tokens.palette.secondary;
  assert.deepEqual(a, b);
  assert.deepEqual(a, buildRamp('#E5117F', tweak));
});

test('la base semántica sustituye el color y rehace su escala suave', () => {
  const { tokens } = composeTokens(defaultBrand(), { semanticBase: { error: '#99335F' } });
  assert.ok(Object.values(tokens.semantic.error).includes('#99335F'));
  assert.equal(tokens.semanticScale.error['200'], tokens.semantic.error['500']);
});

test('tipografía, espaciado, radios y sombras admiten cambios parciales', () => {
  const { tokens } = composeTokens(defaultBrand(), {
    typography: { h1: { size: 48 } },
    spacing: { md: 20 },
    radius: { md: 5 },
    radiusMap: { button: 'full' },
    shadows: { lg: { blur: 30 } },
  });
  const h1 = tokens.typography.find((t) => t.key === 'h1')!;
  assert.equal(h1.size, 48);
  assert.equal(h1.weight, 700);
  assert.equal(tokens.spacing.find((s) => s.name === 'md')!.value, 20);
  assert.equal(tokens.radius.md, 5);
  assert.equal(tokens.radiusMap.button, 'full');
  const lg = tokens.shadows.find((s) => s.name === 'lg')!;
  assert.equal(lg.blur, 30);
  assert.equal(lg.y, 8);
});

test('las sombras siguen al neutro 900 final, también si está editado', () => {
  const { tokens } = composeTokens(defaultBrand(), { swatches: { 'palette.neutral.900': '#101010' } });
  for (const s of tokens.shadows) assert.equal(s.color, '#101010');
});

test('un override que apunta a algo que no existe se ignora y se anota, sin lanzar', () => {
  const { tokens, orphans } = composeTokens(defaultBrand(), {
    swatches: { 'palette.accent.500': '#123456', 'palette.primary': '#123456', 'palette.primary.550': '#123456' },
    locks: { accent: buildRamp('#FFD400') },
    rampTweaks: { accent: { chromaBoost: 1, hueShift: 0 } },
    typography: { h9: { size: 10 } },
    spacing: { '5xl': 200 },
    radius: { huge: 40 },
    radiusMap: { button: 'huge' },
    shadows: { xxl: { blur: 1 } },
  });
  assert.equal(tokens.palette.accent, undefined);
  assert.deepEqual(orphans.sort(), [
    'locks.accent',
    'radius.huge',
    'radiusMap.button',
    'rampTweaks.accent',
    'shadows.xxl',
    'spacing.5xl',
    'swatches.palette.accent.500',
    'swatches.palette.primary',
    'swatches.palette.primary.550',
    'typography.h9',
  ]);
});

test('componer no toca ni la marca ni los overrides', () => {
  const brand = defaultBrand();
  const locked = generateTokens(brand).palette.primary;
  const overrides = { locks: { primary: locked } };
  const before = JSON.stringify({ brand, overrides });
  const { tokens } = composeTokens(brand, overrides);
  tokens.palette.primary['500'] = '#000000';
  assert.equal(JSON.stringify({ brand, overrides }), before);
});
