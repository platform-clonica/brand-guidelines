import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_EDIT_MODEL, EDIT_MODELS, editModel, outputSize } from '../edit/models.ts';

/* Decisión de Carlos (3 de octubre de 2026): Nano Banana 2 por defecto y Pro a elección de quien edita. */

test('dos modelos, Nano Banana 2 por defecto', () => {
  assert.deepEqual(EDIT_MODELS.map((m) => m.id), ['fast', 'pro']);
  assert.equal(DEFAULT_EDIT_MODEL, 'fast');
  assert.equal(editModel('fast').label, 'Nano Banana 2');
  assert.equal(editModel('pro').label, 'Nano Banana Pro');
  assert.equal(editModel('fast').model, 'gemini-3.1-flash-image');
  assert.equal(editModel('pro').model, 'gemini-3-pro-image');
});

test('un id desconocido cae al modelo por defecto', () => {
  assert.equal(editModel('otro').id, 'fast');
  assert.equal(editModel(undefined).id, 'fast');
});

test('Nano Banana 2 pide 2K hasta 2048 px de lado y 4K por encima; Pro, siempre 2K', () => {
  assert.equal(outputSize('fast', 1600), '2K');
  assert.equal(outputSize('fast', 2048), '2K');
  assert.equal(outputSize('fast', 2049), '4K');
  assert.equal(outputSize('fast', 6000), '4K');
  assert.equal(outputSize('pro', 6000), '2K');
  assert.equal(outputSize('pro', 1600), '2K');
});
