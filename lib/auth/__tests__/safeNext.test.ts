import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NEXT, safeNext } from '../safeNext.ts';

test('deja pasar las superficies del equipo', () => {
  assert.equal(safeNext('/home'), '/home');
  assert.equal(safeNext('/deck'), '/deck');
  assert.equal(safeNext('/deck/abc-123'), '/deck/abc-123');
  assert.equal(safeNext('/forms/maker'), '/forms/maker');
  assert.equal(safeNext('/forms/maker/abc-123'), '/forms/maker/abc-123');
});

test('bloquea redirecciones externas', () => {
  assert.equal(safeNext('//evil.com'), DEFAULT_NEXT);
  assert.equal(safeNext('https://evil.com'), DEFAULT_NEXT);
  assert.equal(safeNext('//evil.com/deck'), DEFAULT_NEXT);
});

test('bloquea rutas que solo empiezan igual', () => {
  // El guard anterior (`startsWith('/deck')`) dejaba pasar esto.
  assert.equal(safeNext('/deckhouse'), DEFAULT_NEXT);
  assert.equal(safeNext('/homepage'), DEFAULT_NEXT);
  assert.equal(safeNext('/forms/makerfoo'), DEFAULT_NEXT);
  assert.equal(safeNext('/forms/f/fk_x'), DEFAULT_NEXT);
});

test('vacío o ausente cae al destino por defecto', () => {
  assert.equal(safeNext(null), DEFAULT_NEXT);
  assert.equal(safeNext(undefined), DEFAULT_NEXT);
  assert.equal(safeNext(''), DEFAULT_NEXT);
});

test('el destino por defecto es el dispatcher, no la galería de presentaciones', () => {
  assert.equal(DEFAULT_NEXT, '/home');
});

test('acepta un fallback distinto', () => {
  assert.equal(safeNext(null, '/forms/maker'), '/forms/maker');
});
