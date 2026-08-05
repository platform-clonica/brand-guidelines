import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NEXT, safeNext } from '../safeNext.ts';

test('deja pasar las superficies del workspace', () => {
  assert.equal(safeNext('/workspace'), '/workspace');
  assert.equal(safeNext('/workspace/deckmak_r'), '/workspace/deckmak_r');
  assert.equal(safeNext('/workspace/deckmak_r/abc-123'), '/workspace/deckmak_r/abc-123');
  assert.equal(safeNext('/workspace/formmak_r'), '/workspace/formmak_r');
  assert.equal(safeNext('/workspace/formmak_r/abc-123'), '/workspace/formmak_r/abc-123');
});

test('bloquea redirecciones externas', () => {
  assert.equal(safeNext('//evil.com'), DEFAULT_NEXT);
  assert.equal(safeNext('https://evil.com'), DEFAULT_NEXT);
  assert.equal(safeNext('//evil.com/workspace'), DEFAULT_NEXT);
});

test('bloquea rutas que solo empiezan igual', () => {
  // El guard original (`startsWith('/deck')`) dejaba pasar esta clase de rutas.
  assert.equal(safeNext('/workspacefoo'), DEFAULT_NEXT);
  assert.equal(safeNext('/workspace-privado'), DEFAULT_NEXT);
});

test('no devuelve a superficies públicas: nadie inicia sesión para acabar ahí', () => {
  assert.equal(safeNext('/forms/f/fk_x'), DEFAULT_NEXT);
  assert.equal(safeNext('/deck/abc/view'), DEFAULT_NEXT);
  assert.equal(safeNext('/timer'), DEFAULT_NEXT);
});

test('las rutas antiguas ya no valen como destino', () => {
  // De esas se encarga la redirección de legacyRoutes, no el login.
  assert.equal(safeNext('/deck'), DEFAULT_NEXT);
  assert.equal(safeNext('/home'), DEFAULT_NEXT);
  assert.equal(safeNext('/forms/maker'), DEFAULT_NEXT);
});

test('vacío o ausente cae al destino por defecto', () => {
  assert.equal(safeNext(null), DEFAULT_NEXT);
  assert.equal(safeNext(undefined), DEFAULT_NEXT);
  assert.equal(safeNext(''), DEFAULT_NEXT);
});

test('el destino por defecto es el dispatcher del workspace', () => {
  assert.equal(DEFAULT_NEXT, '/workspace');
});
