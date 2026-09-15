import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, getComponent } from '../components.ts';
import { composeTokens, ENGINE_VERSION } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { resolveTokens } from '../engine/resolve.ts';
import { contrastWarnings } from '../engine/warnings.ts';
import { exportCss } from '../export/css.ts';
import { exportJson } from '../export/json.ts';
import { buildStyleguideComponents, exportStyleguide } from '../export/styleguide.ts';
import type { Brand, Tokens } from '../schema.ts';

const GENERATED_AT = '2026-09-15T10:00:00.000Z';
const tokensFor = (patch: Partial<Brand> = {}) => composeTokens({ ...defaultBrand(), ...patch }, {}).tokens;
const EVIL_FONT = 'Evil"; } </style><script>alert(1)</script>';

// ── JSON ─────────────────────────────────────────────────────────────────────

test('JSON: determinista, con la fecha y la versión del motor en los metadatos', () => {
  const tokens = tokensFor();
  const a = exportJson(tokens, { name: 'Acme', generatedAt: GENERATED_AT, configs: {} });
  assert.deepEqual(a, exportJson(tokens, { name: 'Acme', generatedAt: GENERATED_AT, configs: {} }));
  assert.equal(a.meta.generatedAt, GENERATED_AT);
  assert.equal(a.meta.engineVersion, ENGINE_VERSION);
  assert.deepEqual(a.meta.fonts.map((f) => f.family), ['IBM Plex Serif', 'IBM Plex Mono']);
});

test('JSON: cada color lleva su contraste; los semánticos, su escala suave', () => {
  const json = exportJson(tokensFor(), { name: 'Acme', generatedAt: GENERATED_AT, configs: {} });
  assert.deepEqual(json.color.primary['500'], { value: '#0E9F8C', contrast: 5.7, level: 'AA', on: '#111111' });
  assert.deepEqual(Object.keys(json.color.success), ['50', '100', '200']);
});

test('JSON: tipografía, espaciado, radios, sombras, breakpoints y retícula con unidades', () => {
  const json = exportJson(tokensFor(), { name: 'Acme', generatedAt: GENERATED_AT, configs: {} });
  assert.equal(json.typography.h1.fontSize, '43px');
  assert.equal(json.typography.h1.fontFamily, 'IBM Plex Serif');
  assert.deepEqual(json.spacing.md, { value: '24px', rem: '1.5rem' });
  assert.deepEqual(json.radius.full, { value: '999px' });
  assert.equal(json.radiusMap.button, 'md');
  assert.equal(json.shadow.md.value, '0px 4px 8px 0px rgba(34, 37, 41, 0.08)');
  assert.deepEqual(json.breakpoint.wide, { min: '1440px', max: null });
  assert.deepEqual(json.grid.desktop, { columns: 12, margin: '40px', gutter: '24px' });
});

test('JSON: solo los componentes configurados, con sus props resueltas', () => {
  const button = getComponent('button')!;
  const json = exportJson(tokensFor(), { name: 'Acme', generatedAt: GENERATED_AT, configs: { button: defaultConfig(button) } });
  assert.deepEqual(Object.keys(json.components), ['button']);
  assert.equal(json.components.button.selected.size, 'MD');
  assert.equal(json.components.button.tokens.padX, 26);
});

// ── CSS ──────────────────────────────────────────────────────────────────────

const declaredVars = (css: string) => [...css.matchAll(/^\s*(--ds-[a-z0-9-]+):/gm)].map((m) => m[1]);

test('CSS: una variable por token, ninguna repetida', () => {
  const vars = declaredVars(exportCss(tokensFor({ colors: { primary: '#0E9F8C', secondary: '#E5117F', accent: '#FFD400' } })));
  assert.equal(new Set(vars).size, vars.length);
  for (const v of ['--ds-primary-500', '--ds-accent-900', '--ds-neutral-50', '--ds-success-200', '--ds-space-md',
    '--ds-radius-full', '--ds-shadow-md', '--ds-font-size-h1', '--ds-line-height-caption', '--ds-font-heading']) {
    assert.ok(vars.includes(v), `falta ${v}`);
  }
  // 3 familias × 10 + neutros 10 + 4 semánticos × 3 + 11 roles × 3 + 2 familias + 10 espacios + 7 radios + 4 sombras
  assert.equal(vars.length, 30 + 10 + 12 + 33 + 2 + 10 + 7 + 4);
});

test('CSS: los valores por defecto se escriben como en el prototipo', () => {
  const css = exportCss(tokensFor());
  assert.ok(css.includes('--ds-primary-500: #0E9F8C;'));
  assert.ok(css.includes('--ds-space-md: 24px;'));
  assert.ok(css.includes('--ds-radius-full: 999px;'));
  assert.ok(css.includes('--ds-font-size-h1: 43px;'));
});

test('CSS: un @import por familia tipográfica', () => {
  const imports = exportCss(tokensFor()).match(/@import url\(/g) ?? [];
  assert.equal(imports.length, 2);
});

test('CSS: una familia tipográfica maliciosa no rompe la hoja ni sale de ella', () => {
  const tokens = tokensFor();
  tokens.fonts.heading = EVIL_FONT;
  const css = exportCss(tokens);
  assert.ok(!css.includes('</style>'), css);
  assert.ok(!css.includes('"; }'), css);
});

test('CSS: nombres de breakpoint y retícula no rompen comentarios ni selectores', () => {
  const tokens: Tokens = tokensFor();
  tokens.breakpoints[0].name = 'Móvil */ body { display: none } /*';
  tokens.grid[3].name = 'Pantalla grande';
  const css = exportCss(tokens);
  assert.equal((css.match(/\/\*/g) ?? []).length, (css.match(/\*\//g) ?? []).length);
  assert.ok(!css.includes('body { display: none }'));
  assert.ok(css.includes('.ds-grid-pantalla-grande {'));
});

// ── Styleguide ───────────────────────────────────────────────────────────────

const styleguideFor = (patch: { name?: string; note?: string; tokens?: Tokens } = {}) => {
  const brand = defaultBrand();
  const tokens = patch.tokens ?? composeTokens(brand, {}).tokens;
  const button = getComponent('button')!;
  const configs = { button: { ...defaultConfig(button), note: patch.note ?? '' } };
  const components = buildStyleguideComponents({
    configs,
    resolved: resolveTokens(tokens, 'light'),
    render: (key, config) => `<b>${key}:${config.variant}:${config.size}:${config.state}</b>`,
  });
  return exportStyleguide({
    name: patch.name ?? 'Acme',
    generatedAt: GENERATED_AT,
    tokens,
    mode: 'light',
    warnings: contrastWarnings(tokens, brand),
    components,
  });
};

test('styleguide: el nombre del sistema y las notas se escapan', () => {
  const html = styleguideFor({ name: '<script>alert(1)</script>', note: '<img src=x onerror=alert(1)>' });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('styleguide: una familia tipográfica maliciosa no sale del bloque de estilos', () => {
  const tokens = tokensFor();
  tokens.fonts.heading = EVIL_FONT;
  const html = styleguideFor({ tokens });
  assert.equal((html.match(/<\/style>/g) ?? []).length, 1);
  assert.ok(!html.includes('<script>alert(1)'));
});

test('styleguide: una hoja de fuentes por familia, en castellano y sin puntos suspensivos', () => {
  const html = styleguideFor();
  assert.equal((html.match(/<link rel="stylesheet"/g) ?? []).length, 2);
  assert.ok(html.includes('<html lang="es">'));
  assert.ok(!html.includes('…'));
  assert.ok(!html.includes('\\u2026'));
});

test('styleguide: los avisos de contraste aparecen', () => {
  const brand = { ...defaultBrand(), colors: { primary: '#FFD400', secondary: '#2F5FD6' } };
  const tokens = composeTokens(brand, {}).tokens;
  const html = exportStyleguide({
    name: 'Acme', generatedAt: GENERATED_AT, tokens, mode: 'light',
    warnings: contrastWarnings(tokens, brand), components: [],
  });
  assert.ok(html.includes('Avisos de contraste'));
  assert.ok(html.includes('#FFD400'));
});

test('styleguide: cada combinación de ejes se pinta, y solo la seleccionada es visible', () => {
  const button = getComponent('button')!;
  const [section] = buildStyleguideComponents({
    configs: { button: defaultConfig(button) },
    resolved: resolveTokens(tokensFor(), 'light'),
    render: (key, config) => `<b>${config.variant}-${config.size}-${config.state}</b>`,
  });
  assert.equal(section.variants.length, 4 * 3 * 6);
  assert.equal(section.variants.filter((v) => v.selected).length, 1);
  assert.equal(section.variants.find((v) => v.selected)!.html, '<b>Primary-MD-Default</b>');
});

test('styleguide: si un render falla, esa combinación sale vacía y las demás siguen', () => {
  const button = getComponent('button')!;
  const [section] = buildStyleguideComponents({
    configs: { button: defaultConfig(button) },
    resolved: resolveTokens(tokensFor(), 'light'),
    render: (key, config) => {
      if (config.state === 'Loading') throw new Error('boom');
      return '<b>ok</b>';
    },
  });
  assert.equal(section.variants.filter((v) => v.html === '<em>—</em>').length, 4 * 3);
});
