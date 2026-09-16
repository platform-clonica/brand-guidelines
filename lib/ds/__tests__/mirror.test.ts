import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { mirrorFrom, paletteStrip } from '../mirror.ts';

test('el espejo copia nombre y cliente de la marca, recortados', () => {
  assert.deepEqual(mirrorFrom({ ...defaultBrand(), name: '  Acme DS ', client: ' Acme ' }), { name: 'Acme DS', client: 'Acme' });
});

test('sin nombre, la columna not null recibe uno legible; sin cliente, null', () => {
  assert.deepEqual(mirrorFrom({ ...defaultBrand(), name: '   ', client: '  ' }), { name: 'Sistema sin nombre', client: null });
  assert.equal(mirrorFrom({ ...defaultBrand(), client: null }).client, null);
});

test('la tira de la tarjeta es primario 600, secundario 600 y neutro 400', () => {
  const { tokens } = composeTokens(defaultBrand(), {});
  assert.deepEqual(paletteStrip(tokens), [tokens.palette.primary['600'], tokens.palette.secondary['600'], tokens.palette.neutral['400']]);
});

test('la tira aguanta tokens dañados o ausentes sin lanzar', () => {
  assert.deepEqual(paletteStrip(null), []);
  assert.deepEqual(paletteStrip({ palette: { primary: { '600': '#123456' } } }), ['#123456']);
  assert.deepEqual(paletteStrip({ palette: 'x' }), []);
});
