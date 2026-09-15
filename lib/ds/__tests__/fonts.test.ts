import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURATED_FONTS, fontStylesheets, googleFontsUrl } from '../fonts.ts';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import type { Brand } from '../schema.ts';

const tokensFor = (patch: Partial<Brand>) => composeTokens({ ...defaultBrand(), ...patch }, {}).tokens;

test('la lista curada es la del prototipo, sin repetidos', () => {
  assert.equal(CURATED_FONTS.length, 27);
  assert.equal(new Set(CURATED_FONTS).size, 27);
  assert.ok(CURATED_FONTS.includes('IBM Plex Serif'));
});

test('la URL codifica espacios como + y pide los pesos ordenados', () => {
  assert.equal(
    googleFontsUrl('IBM Plex Serif', [600, 300, 400, 300]),
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@300;400;600&display=swap',
  );
});

test('un nombre con caracteres raros no puede inyectar parámetros en la URL', () => {
  const url = googleFontsUrl('Foo&family=Bar', [400]);
  assert.ok(!url.includes('&family=Bar'), url);
  assert.ok(url.includes('Foo%26family%3DBar'), url);
});

/* Un enlace POR FAMILIA (plan, H10): Google devuelve 400 a toda la petición si una familia no existe,
   así que una errata en el campo libre dejaba sin fuentes a las dos. */
test('una hoja por familia, con los pesos que usa de verdad la escala', () => {
  const sheets = fontStylesheets(tokensFor({ fonts: { heading: 'Inter', body: 'IBM Plex Mono' } }));
  assert.deepEqual(sheets.map((s) => s.family), ['Inter', 'IBM Plex Mono']);
  assert.ok(sheets[0].url.endsWith(':wght@600;700&display=swap'), sheets[0].url);
  assert.ok(sheets[1].url.endsWith(':wght@400&display=swap'), sheets[1].url);
});

test('si titular y cuerpo comparten familia, sale una sola hoja con todos los pesos', () => {
  const sheets = fontStylesheets(tokensFor({ fonts: { heading: 'Inter', body: 'Inter' } }));
  assert.equal(sheets.length, 1);
  assert.ok(sheets[0].url.endsWith(':wght@400;600;700&display=swap'), sheets[0].url);
});

test('un nombre de familia vacío no genera hoja', () => {
  const tokens = tokensFor({});
  tokens.fonts.body = '   ';
  assert.deepEqual(fontStylesheets(tokens).map((s) => s.family), ['IBM Plex Serif']);
});
