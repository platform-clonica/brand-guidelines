import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGantt } from '../blocks.ts';

test('the axis unit comes from the count line key (default Semanas)', () => {
  assert.equal(parseGantt('semanas: 8\nFase: 1').unit, 'Semanas');
  assert.equal(parseGantt('Fase: 1').unit, 'Semanas'); // default when no axis line
  const meses = parseGantt('meses: 6\nDescubrir: 1-2');
  assert.equal(meses.unit, 'Meses');
  assert.equal(meses.weeks, 6);
  assert.equal(parseGantt('días: 30').unit, 'Días');
});

test('parses weeks, rows with ranges, and milestones', () => {
  const g = parseGantt('semanas: 8\nDiagnóstico: 1\nDiscovery: 2-3\nVolumetría: 4-8\nhitos cliente: 1, 3, 5, 8');
  assert.equal(g.weeks, 8);
  assert.deepEqual(g.rows[0], { label: 'Diagnóstico', spans: [[1, 1]], accent: 'opal' });
  assert.deepEqual(g.rows[1], { label: 'Discovery', spans: [[2, 3]], accent: 'bordeaux' });
  assert.deepEqual(g.rows[2], { label: 'Volumetría', spans: [[4, 8]], accent: 'emerald' });
  assert.deepEqual(g.milestones, [1, 3, 5, 8]);
});

test('parses half-week endpoints and a bare fractional value', () => {
  const g = parseGantt('semanas: 8\nKick Off: 0.5\nDiscovery: 2-3.5\nCierre: 4-4.5');
  assert.deepEqual(g.rows[0], { label: 'Kick Off', spans: [[1, 1.5]], accent: 'opal' });
  assert.deepEqual(g.rows[1], { label: 'Discovery', spans: [[2, 3.5]], accent: 'bordeaux' });
  assert.deepEqual(g.rows[2], { label: 'Cierre', spans: [[4, 4.5]], accent: 'emerald' });
});

test('a comma-separated row draws one bar per span, gaps included', () => {
  const g = parseGantt('meses: 12\nDescubrimiento: 4, 6, 9');
  assert.deepEqual(g.rows[0].spans, [[4, 4], [6, 6], [9, 9]]);
  assert.equal(g.rows[0].accent, 'opal'); // one phase, one colour for all its spans
});

test('a row mixes ranges, single units and halves in the same list', () => {
  const g = parseGantt('meses: 12\nAcompañamiento: 1-3, 6, 9-10.5');
  assert.deepEqual(g.rows[0].spans, [[1, 3], [6, 6], [9, 10.5]]);
});

test('spans keep the written order and the accent rotates per row, not per span', () => {
  const g = parseGantt('meses: 12\nUna: 9, 2\nOtra: 3, 4');
  assert.deepEqual(g.rows[0].spans, [[9, 9], [2, 2]]);
  assert.equal(g.rows[0].accent, 'opal');
  assert.equal(g.rows[1].accent, 'bordeaux');
});

test('empty items in the list are dropped instead of drawing a phantom bar', () => {
  assert.deepEqual(parseGantt('meses: 6\nFase: 2, , 4,').rows[0].spans, [[2, 2], [4, 4]]);
  assert.deepEqual(parseGantt('meses: 6\nSin valor:').rows[0].spans, []);
});
