import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allSelected, dropFromSelection, refreshSelection, selectAll, toggleSelected } from '../selection.ts';

/* Entrega 3, G13: la selección de la galería. Vive fuera del listado para sobrevivir a filtros, búsqueda y
   páginas, y guarda cada imagen entera porque las acciones en bloque necesitan sus datos aunque el filtro la
   esconda. */

type It = { id: string; name: string; tags: string[] };
const a: It = { id: 'a', name: 'A', tags: [] };
const b: It = { id: 'b', name: 'B', tags: [] };
const c: It = { id: 'c', name: 'C', tags: ['x'] };

test('marcar y desmarcar no toca la selección anterior', () => {
  const s0 = new Map<string, It>();
  const s1 = toggleSelected(s0, a);
  const s2 = toggleSelected(s1, b);
  assert.deepEqual([...s2.keys()], ['a', 'b']);
  assert.equal(s0.size, 0);
  assert.deepEqual([...toggleSelected(s2, a).keys()], ['b']);
});

test('«Seleccionar las N visibles» añade las visibles y conserva las que el filtro esconde', () => {
  const s = selectAll(new Map([['c', c]]), [a, b]);
  assert.deepEqual([...s.keys()].sort(), ['a', 'b', 'c']);
  assert.ok(allSelected(s, [a, b]));
  assert.ok(!allSelected(new Map([['a', a]]), [a, b]));
  assert.ok(!allSelected(s, []), 'sin visibles no hay nada que seleccionar');
});

test('las que desaparecen del banco salen de la selección; si no había ninguna, es la misma selección', () => {
  const s = new Map([['a', a], ['b', b]]);
  assert.deepEqual([...dropFromSelection(s, ['b', 'z']).keys()], ['a']);
  assert.equal(dropFromSelection(s, ['z']), s);
});

test('una imagen que cambia se actualiza en la selección, sin perder lo que la fila nueva no trae', () => {
  const withCount = { ...c, use_count: 2 };
  const s = new Map([['c', withCount]]);
  const next = refreshSelection(s, [{ id: 'c', name: 'C', tags: ['x', 'y'] }]);
  assert.deepEqual(next.get('c'), { id: 'c', name: 'C', tags: ['x', 'y'], use_count: 2 });
  assert.equal(refreshSelection(s, [{ id: 'z', name: 'Z', tags: [] }]), s);
});
