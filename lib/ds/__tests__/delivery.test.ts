import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliveryFile, fileBase } from '../delivery.ts';
import { composeTokens, ENGINE_VERSION } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { getComponent, defaultConfig } from '../components.ts';

const GENERATED_AT = '2026-09-16T09:00:00.000Z';
const tokens = composeTokens(defaultBrand(), {}).tokens;
const base = { name: 'Acme Diseño', tokens, configs: {}, generatedAt: GENERATED_AT };

test('el nombre del fichero sale del nombre del sistema, con respaldo si no tiene letras', () => {
  assert.equal(fileBase('Acme Diseño'), 'acme-diseno');
  assert.equal(fileBase('  '), 'design-system');
  assert.equal(fileBase('***'), 'design-system');
});

test('JSON: nombre, mime y la fecha que se le pasa, sin recalcular tokens', () => {
  const file = deliveryFile('json', base);
  assert.equal(file?.name, 'acme-diseno-tokens.json');
  assert.equal(file?.mime, 'application/json');
  const parsed = JSON.parse(file!.content);
  assert.equal(parsed.meta.generatedAt, GENERATED_AT);
  assert.equal(parsed.meta.engineVersion, ENGINE_VERSION);
  assert.equal(Object.keys(parsed.components).length, 17);
});

test('JSON: la configuración guardada de un componente viaja en el fichero', () => {
  const button = getComponent('button')!;
  const file = deliveryFile('json', { ...base, configs: { button: { ...defaultConfig(button), size: 'LG', note: 'Escala en hover' } } });
  const parsed = JSON.parse(file!.content);
  assert.equal(parsed.components.button.selected.size, 'LG');
  assert.equal(parsed.components.button.note, 'Escala en hover');
});

test('CSS: la hoja entera, con los semánticos fuertes que se decidieron en 5d', () => {
  const file = deliveryFile('css', base);
  assert.equal(file?.name, 'acme-diseno-tokens.css');
  assert.equal(file?.mime, 'text/css');
  assert.match(file!.content, /--ds-primary-500:/);
  assert.match(file!.content, /--ds-error-600:/);
});

test('styleguide: entrega el HTML ya pintado, en text/html', () => {
  const html = '<!doctype html><html lang="es"><body>Styleguide</body></html>';
  const file = deliveryFile('styleguide', { ...base, styleguideHtml: html });
  assert.equal(file?.name, 'acme-diseno-styleguide.html');
  assert.equal(file?.mime, 'text/html');
  assert.equal(file?.content, html);
});

test('styleguide sin HTML no devuelve fichero: los componentes los pinta React, no este módulo', () => {
  assert.equal(deliveryFile('styleguide', base), null);
  assert.equal(deliveryFile('styleguide', { ...base, styleguideHtml: '' }), null);
});
