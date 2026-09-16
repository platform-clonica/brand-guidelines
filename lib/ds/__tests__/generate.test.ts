import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTokens } from '../engine/generate.ts';
import { defaultBrand } from '../engine/presets.ts';
import { SEMANTIC_KEYS } from '../engine/semantic.ts';

/* Los literales de este fichero salen de ejecutar el motor del prototipo (L0) con los mismos
   parámetros: son la prueba de que el port es fiel, no valores elegidos a mano. */

test('la escala tipográfica por defecto coincide con la del prototipo', () => {
  const t = generateTokens(defaultBrand());
  assert.deepEqual(
    t.typography.map((x) => [x.key, x.size, x.weight, x.lineHeight, x.letterSpacing]),
    [
      ['display-xl', 59, 700, 65, -1], ['display-l', 51, 700, 56, -1], ['h1', 43, 700, 52, -1],
      ['h2', 37, 700, 46, -1], ['h3', 31, 600, 40, -0.5], ['h4', 25, 600, 34, -0.5],
      ['h5', 20, 600, 28, 0], ['h6', 18, 600, 25, 0], ['body-m', 16, 400, 25, 0],
      ['body-s', 14, 400, 21, 0], ['caption', 12, 400, 17, 0],
    ],
  );
});

test('el espaciado por defecto y el compacto coinciden con los del prototipo', () => {
  assert.deepEqual(generateTokens(defaultBrand()).spacing.map((s) => [s.name, s.value]), [
    ['3xs', 4], ['2xs', 8], ['xs', 12], ['sm', 16], ['md', 24], ['lg', 32], ['xl', 48], ['2xl', 64], ['3xl', 96], ['4xl', 128],
  ]);
  const compact = generateTokens({ ...defaultBrand(), density: 'compact' });
  assert.deepEqual(compact.spacing.map((s) => s.value), [4, 6, 10, 12, 18, 24, 36, 48, 72, 96]);
});

test('radios y sombras por defecto coinciden con los del prototipo', () => {
  const t = generateTokens(defaultBrand());
  assert.deepEqual(t.radius, { xs: 2, sm: 3, md: 4, lg: 6, xl: 8, '2xl': 12, full: 999 });
  assert.deepEqual(t.shadows, [
    { name: 'sm', x: 0, y: 1, blur: 2, spread: 0, color: '#222529', opacity: 0.05 },
    { name: 'md', x: 0, y: 4, blur: 8, spread: 0, color: '#222529', opacity: 0.08 },
    { name: 'lg', x: 0, y: 8, blur: 16, spread: -2, color: '#222529', opacity: 0.1 },
    { name: 'xl', x: 0, y: 12, blur: 24, spread: -4, color: '#222529', opacity: 0.12 },
  ]);
});

test('sin sombra: opacidad, desplazamiento y desenfoque a cero', () => {
  for (const s of generateTokens({ ...defaultBrand(), shadow: 'none' }).shadows) {
    assert.equal(s.opacity, 0);
    assert.equal(s.y, 0);
    assert.equal(s.blur, 0);
  }
});

test('neutros y escalas semánticas por defecto coinciden con los del prototipo', () => {
  const t = generateTokens(defaultBrand());
  assert.deepEqual(t.palette.neutral, {
    '50': '#F4F6F8', '100': '#E8EBEE', '200': '#D5D9DE', '300': '#BCC2C8', '400': '#A0A7AE',
    '500': '#848B92', '600': '#6A7178', '700': '#52575E', '800': '#393E43', '900': '#222529',
  });
  assert.deepEqual(t.semanticScale, {
    success: { '50': '#E3F7E7', '100': '#B7E9C3', '200': '#00AF59' },
    warning: { '50': '#FAF2DF', '100': '#F1DDAD', '200': '#DEAD00' },
    error: { '50': '#FFEBE9', '100': '#FFCCC5', '200': '#F04F47' },
    info: { '50': '#E6F1FF', '100': '#C0DCFF', '200': '#1F89F6' },
  });
});

test('mismos parámetros, mismos tokens', () => {
  const brand = { ...defaultBrand(), colors: { primary: '#2F5FD6', secondary: '#D6246B', accent: '#FFD400' } };
  assert.deepEqual(generateTokens(brand), generateTokens(brand));
});

test('los pesos salen de brand.weights, no de valores fijos', () => {
  const t = generateTokens({ ...defaultBrand(), weights: { display: 300, heading: 400, body: 400 } });
  const used = new Set(t.typography.map((x) => x.weight));
  assert.deepEqual([...used].sort(), [300, 400]);
});

test('hay una rampa por color de marca más los neutros, y la escala suave nace del 500 semántico', () => {
  const t = generateTokens({ ...defaultBrand(), colors: { primary: '#2F5FD6', secondary: '#D6246B', accent: '#FFD400' } });
  assert.deepEqual(Object.keys(t.palette), ['primary', 'secondary', 'accent', 'neutral']);
  for (const k of SEMANTIC_KEYS) assert.equal(t.semanticScale[k]['200'], t.semantic[k]['500']);
});

test('los tokens no comparten referencias con la marca', () => {
  const brand = defaultBrand();
  const t = generateTokens(brand);
  t.breakpoints[0].min = 99;
  t.grid[0].columns = 99;
  t.fonts.heading = 'Otra';
  assert.equal(brand.breakpoints[0].min, 0);
  assert.equal(brand.grid[0].columns, 4);
  assert.equal(brand.fonts.heading, 'IBM Plex Serif');
});
