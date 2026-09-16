import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTokens, ENGINE_VERSION } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { exportFile, filterSystems, galleryFacets, type GalleryFilter } from '../gallery.ts';
import type { DesignSystemListItem } from '../types.ts';

const STAMP = '2026-09-15T21:30:00.123456+00:00';

const item = (over: Partial<DesignSystemListItem>): DesignSystemListItem => ({
  id: over.name ?? 'id', public_id: 'ds_x', name: 'Sistema', client: null, status: 'draft', tags: [],
  engine_version: ENGINE_VERSION, logo_path: null, created_at: STAMP, updated_at: STAMP, palette: [],
  ...over,
});

const ITEMS = [
  item({ name: 'Acme web', client: 'Acme', status: 'published', tags: ['web', 'app'] }),
  item({ name: 'Banco', client: 'Banco Sur', tags: ['web'] }),
  item({ name: 'Interno', client: null, tags: ['plantilla'] }),
];

const none: GalleryFilter = { search: '', client: null, tags: [], status: null };
const names = (list: DesignSystemListItem[]) => list.map((i) => i.name);

// ── Filtro ───────────────────────────────────────────────────────────────────

test('filtro: sin criterios devuelve todo, en el mismo orden', () => {
  assert.deepEqual(names(filterSystems(ITEMS, none)), ['Acme web', 'Banco', 'Interno']);
});

test('filtro: el buscador mira nombre, cliente y etiquetas, desde el tercer carácter', () => {
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, search: 'su' })), ['Acme web', 'Banco', 'Interno']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, search: ' SUR ' })), ['Banco']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, search: 'plant' })), ['Interno']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, search: 'acm' })), ['Acme web']);
});

test('filtro: estado, cliente y etiquetas se suman (las etiquetas, todas a la vez)', () => {
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, status: 'published' })), ['Acme web']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, status: 'draft' })), ['Banco', 'Interno']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, client: 'Banco Sur' })), ['Banco']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, tags: ['web'] })), ['Acme web', 'Banco']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, tags: ['web', 'app'] })), ['Acme web']);
  assert.deepEqual(names(filterSystems(ITEMS, { ...none, tags: ['web'], status: 'draft' })), ['Banco']);
});

test('facetas: etiquetas y clientes en uso, sin repetir y ordenados', () => {
  assert.deepEqual(galleryFacets(ITEMS), { tags: ['app', 'plantilla', 'web'], clients: ['Acme', 'Banco Sur'] });
  assert.deepEqual(galleryFacets([]), { tags: [], clients: [] });
});

// ── Exportar ─────────────────────────────────────────────────────────────────

const row = () => {
  const brand = { ...defaultBrand(), name: 'Acme Diseño', client: 'Acme' };
  const tokens = composeTokens(brand, {}).tokens;
  return { name: 'Acme Diseño', brand, overrides: {}, configs: {}, tokens, engine_version: ENGINE_VERSION };
};

test('exportar: JSON y CSS con nombre de fichero limpio y generatedAt inyectado', () => {
  const json = exportFile(row(), 'json', STAMP);
  assert.equal(json.ok, true);
  if (!json.ok) return;
  assert.equal(json.file.name, 'acme-diseno-tokens.json');
  assert.equal(json.file.mime, 'application/json');
  const parsed = JSON.parse(json.file.content);
  assert.equal(parsed.meta.generatedAt, STAMP);
  assert.equal(parsed.meta.name, 'Acme Diseño');

  const css = exportFile(row(), 'css', STAMP);
  assert.equal(css.ok, true);
  if (css.ok) {
    assert.equal(css.file.name, 'acme-diseno-tokens.css');
    assert.match(css.file.content, /--ds-primary-500:/);
  }
});

test('exportar: sale de los tokens GUARDADOS, sin recalcular, aunque el motor sea otro', () => {
  const r = { ...row(), engine_version: '0' };
  (r.tokens.palette.primary as Record<string, string>)['500'] = '#123456';
  const css = exportFile(r, 'css', STAMP);
  assert.equal(css.ok, true);
  if (css.ok) assert.match(css.file.content, /--ds-primary-500: #123456;/);
});

test('exportar: con los tokens dañados no se descarga nada y se dice por qué', () => {
  const res = exportFile({ ...row(), tokens: { palette: 'roto' } }, 'json', STAMP);
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.error, /dañados/);
  assert.equal(exportFile(null, 'css', STAMP).ok, false);
});

test('exportar: un nombre sin letras ni números no deja el fichero sin nombre', () => {
  const res = exportFile({ ...row(), name: '***' }, 'json', STAMP);
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.file.name, 'design-system-tokens.json');
});
