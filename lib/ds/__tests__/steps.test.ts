import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DS_STEPS, stepForPath } from '../steps.ts';

test('pasos: cuatro, con etiqueta en castellano y numerados desde 1', () => {
  assert.deepEqual(DS_STEPS.map((s) => s.n), [1, 2, 3, 4]);
  assert.deepEqual(DS_STEPS.map((s) => s.label), ['Marca', 'Fundamentos', 'Componentes', 'Entrega']);
});

test('incidencias: la ruta del campo dice a qué paso llevar', () => {
  assert.equal(stepForPath('brand.breakpoints.1.min'), 1);
  assert.equal(stepForPath('brand.colors.error'), 1);
  assert.equal(stepForPath('overrides.swatches.palette.primary.500'), 2);
  assert.equal(stepForPath('overrides'), 2);
  assert.equal(stepForPath('configs.button'), 3);
  assert.equal(stepForPath('tokens'), null);
  assert.equal(stepForPath('engine_version'), null);
  assert.equal(stepForPath('brandish'), null);
});
