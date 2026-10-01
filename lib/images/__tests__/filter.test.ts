/* IMG_r — búsqueda y filtro.

   La búsqueda se hace en servidor, sobre la columna generada `search_text` (nombre y etiquetas en
   minúsculas y sin tildes). La consulta se pliega aquí con el MISMO mapa que usa el SQL: si los dos se
   separan, «presentación» dejaría de encontrar «presentacion» sin que nada avisara. Por eso uno de
   estos tests lee la migración. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FOLD_FROM,
  FOLD_TO,
  SEARCH_MIN,
  clearFilter,
  decodeCursor,
  encodeCursor,
  escapeLike,
  foldSearch,
  isFiltered,
  keysetFilter,
  matchesFilter,
  pageOf,
  parseListQuery,
  searchText,
  tagFacets,
  toggleTag,
  toggleUntagged,
  type ImageFilter,
} from '../filter.ts';

const none: ImageFilter = { q: '', tags: [], untagged: false };
const pasillo = { name: 'Pasillo de la oficina', tags: ['oficina', 'presentación', 'luz'] };
const antigua = { name: 'IMG_4821', tags: [] };

test('foldSearch pasa a minúsculas y quita las tildes del castellano y el catalán', () => {
  assert.equal(foldSearch('PASILLO'), 'pasillo');
  assert.equal(foldSearch('Presentación'), 'presentacion');
  assert.equal(foldSearch('Ç ñ à è ò ï ü Á'), 'c n a e o i u a');
});

test('el mapa de tildes del cliente es exactamente el de la migración', () => {
  const dir = join(import.meta.dirname, '../../../supabase/migrations');
  const file = readdirSync(dir).find((f) => f.endsWith('_images_bank.sql'));
  assert.ok(file, 'falta la migración *_images_bank.sql');
  const sql = readFileSync(join(dir, file!), 'utf8');
  const m = sql.match(/translate\(\s*lower\([\s\S]*?\),\s*'([^']*)',\s*'([^']*)'\s*\)/);
  assert.ok(m, 'la migración no pliega con translate(lower(...), FROM, TO)');
  assert.equal(m![1], FOLD_FROM);
  assert.equal(m![2], FOLD_TO);
  assert.equal([...FOLD_FROM].length, [...FOLD_TO].length);
});

test('searchText junta nombre y etiquetas, plegados', () => {
  assert.equal(searchText('Sala Grande', ['Presentación', 'luz']), 'sala grande presentacion luz');
});

test('la búsqueda mira nombre y etiquetas y no distingue tildes ni mayúsculas', () => {
  assert.ok(matchesFilter(pasillo, { ...none, q: 'PASILLO' }));
  assert.ok(matchesFilter(pasillo, { ...none, q: 'presentacion' }));
  assert.ok(!matchesFilter(pasillo, { ...none, q: 'escalera' }));
});

test('por debajo del mínimo de caracteres la búsqueda no filtra, como en las otras galerías', () => {
  assert.equal(SEARCH_MIN, 3);
  assert.ok(matchesFilter(pasillo, { ...none, q: 'zz' }));
});

test('varias etiquetas se combinan en Y', () => {
  assert.ok(matchesFilter(pasillo, { ...none, tags: ['oficina', 'luz'] }));
  assert.ok(!matchesFilter(pasillo, { ...none, tags: ['oficina', 'equipo'] }));
});

test('«Sin etiquetas» solo deja pasar las que no tienen ninguna, y gana a las etiquetas', () => {
  assert.ok(matchesFilter(antigua, { ...none, untagged: true }));
  assert.ok(!matchesFilter(pasillo, { ...none, untagged: true }));
  assert.ok(matchesFilter(antigua, { ...none, untagged: true, tags: ['oficina'] }));
});

test('pulsar una etiqueta apaga «Sin etiquetas», y al revés', () => {
  const conSin = toggleUntagged(none);
  assert.deepEqual(conSin, { q: '', tags: [], untagged: true });
  assert.deepEqual(toggleTag(conSin, 'luz'), { q: '', tags: ['luz'], untagged: false });
  assert.deepEqual(toggleUntagged({ q: 'x', tags: ['luz'], untagged: false }), { q: 'x', tags: [], untagged: true });
  assert.deepEqual(toggleTag({ q: '', tags: ['luz', 'oficina'], untagged: false }, 'luz'), { q: '', tags: ['oficina'], untagged: false });
});

test('«Quitar filtros» lo limpia todo, e isFiltered dice cuándo mostrarlo', () => {
  assert.deepEqual(clearFilter(), none);
  assert.ok(!isFiltered(none));
  assert.ok(isFiltered({ ...none, q: 'p' }));
  assert.ok(isFiltered({ ...none, tags: ['luz'] }));
  assert.ok(isFiltered({ ...none, untagged: true }));
});

test('parseListQuery normaliza lo que llega por la URL', () => {
  const q = parseListQuery(new URLSearchParams('q=%20Presentación%20&tags=Luz,%20sala%20grande,luz&limit=500'));
  assert.equal(q.search, 'presentacion');
  assert.deepEqual(q.tags, ['luz', 'sala-grande']);
  assert.equal(q.untagged, false);
  assert.equal(q.limit, 60);
  assert.equal(q.cursor, null);
});

test('parseListQuery: búsqueda corta ignorada, untagged anula tags, límites y cursor dañado', () => {
  assert.equal(parseListQuery(new URLSearchParams('q=ab')).search, '');
  const u = parseListQuery(new URLSearchParams('untagged=1&tags=luz'));
  assert.equal(u.untagged, true);
  assert.deepEqual(u.tags, []);
  assert.equal(parseListQuery(new URLSearchParams('limit=0')).limit, 1);
  assert.equal(parseListQuery(new URLSearchParams('limit=abc')).limit, 60);
  assert.equal(parseListQuery(new URLSearchParams('cursor=basura')).cursor, null);
});

test('el cursor va y vuelve, y solo acepta una fecha y un uuid', () => {
  const c = { createdAt: '2026-10-01T10:00:00.123456+00:00', id: '3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6f' };
  assert.deepEqual(decodeCursor(encodeCursor(c)), c);
  assert.deepEqual(parseListQuery(new URLSearchParams({ cursor: encodeCursor(c) })).cursor, c);
  assert.equal(decodeCursor('2026-10-01T10:00:00Z~no-es-uuid'), null);
  assert.equal(decodeCursor('ayer~3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6f'), null);
});

test('keysetFilter pide lo anterior al cursor en orden (created_at desc, id desc), con los valores entre comillas', () => {
  const c = { createdAt: '2026-10-01T10:00:00.123456+00:00', id: '3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6f' };
  assert.equal(
    keysetFilter(c),
    'created_at.lt."2026-10-01T10:00:00.123456+00:00",and(created_at.eq."2026-10-01T10:00:00.123456+00:00",id.lt.3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6f)',
  );
});

test('escapeLike neutraliza los comodines', () => {
  assert.equal(escapeLike('100%_a\\b'), '100\\%\\_a\\\\b');
});

test('tagFacets cuenta, ordena por uso y luego alfabéticamente, y cuenta las que no tienen', () => {
  const f = tagFacets([
    { tags: ['oficina', 'luz'] },
    { tags: ['luz', 'arquitectura'] },
    { tags: ['equipo'] },
    { tags: [] },
    { tags: [] },
  ]);
  assert.deepEqual(f.tags, [
    { tag: 'luz', count: 2 },
    { tag: 'arquitectura', count: 1 },
    { tag: 'equipo', count: 1 },
    { tag: 'oficina', count: 1 },
  ]);
  assert.equal(f.untagged, 2);
});

test('pageOf corta la página y da el cursor de la última solo si hay más', () => {
  const rows = [1, 2, 3].map((n) => ({ id: `3f2b8c1e-9a4d-4c3b-8f7e-1a2b3c4d5e6${n}`, created_at: `2026-10-0${n}T10:00:00+00:00` }));
  const page = pageOf(rows, 2);
  assert.deepEqual(page.items, rows.slice(0, 2));
  assert.deepEqual(decodeCursor(page.nextCursor), { createdAt: rows[1].created_at, id: rows[1].id });
  assert.equal(pageOf(rows, 3).nextCursor, null);
  assert.deepEqual(pageOf([], 60), { items: [], nextCursor: null });
});
