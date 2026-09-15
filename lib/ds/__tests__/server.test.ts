import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logoObjectPath } from '../../storage/paths.ts';
import { composeTokens, ENGINE_VERSION } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { buildDuplicate, buildInsert, buildPatch, isUuid, listItemFrom, ownedLogoPaths } from '../server.ts';

const ID = '11111111-2222-3333-4444-555555555555';

// ── Crear ────────────────────────────────────────────────────────────────────

test('crear: la fila sale con tokens del motor actual, espejos y etiquetas limpias', () => {
  const brand = { ...defaultBrand(), name: ' Acme ', client: 'Acme' };
  const res = buildInsert({ brand, tags: [' web ', 'web', '', 'app'] });
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.row.name, 'Acme');
  assert.equal(res.row.client, 'Acme');
  assert.equal(res.row.engine_version, ENGINE_VERSION);
  assert.deepEqual(res.row.tokens, composeTokens(brand, {}).tokens);
  assert.deepEqual(res.row.tags, ['web', 'app']);
  assert.deepEqual(res.row.overrides, {});
  assert.deepEqual(res.row.configs, {});
});

test('crear: una marca inválida o con errores de sistema se rechaza con el motivo', () => {
  assert.equal(buildInsert({ brand: { colors: 'rojo' } }).ok, false);
  const reserved = buildInsert({ brand: { ...defaultBrand(), colors: { primary: '#000000', secondary: '#FFFFFF', error: '#FF0000' } } });
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.match(reserved.error, /reservado/);
  assert.equal(buildInsert(null).ok, false);
});

test('crear: los tokens NUNCA vienen del cliente', () => {
  const res = buildInsert({ brand: defaultBrand(), tokens: { palette: { primary: 'trampa' } } });
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.row.tokens, composeTokens(defaultBrand(), {}).tokens);
});

// ── Duplicar ─────────────────────────────────────────────────────────────────

const sourceRow = () => {
  const brand = { ...defaultBrand(), name: 'Acme', client: 'Acme' };
  return {
    id: ID, public_id: 'ds_abc', name: 'Acme', client: 'Acme', status: 'published', tags: ['web'],
    brand, overrides: { spacing: { md: 20 } }, configs: {}, tokens: { viejos: true }, engine_version: '0',
    logo_path: `ds/${ID}/logo-1.svg`, logo_dark_path: null,
  };
};

test('duplicar: copia la marca y los ajustes, nace borrador, sin public_id ni logos, y NO regenera tokens', () => {
  const row = buildDuplicate(sourceRow(), {});
  assert.equal(row.name, 'Acme (copia)');
  assert.equal((row.brand as { name: string }).name, 'Acme (copia)');
  assert.equal(row.status, 'draft');
  assert.deepEqual(row.tokens, { viejos: true });
  assert.equal(row.engine_version, '0');
  assert.deepEqual(row.overrides, { spacing: { md: 20 } });
  assert.deepEqual(row.tags, ['web']);
  assert.equal('public_id' in row, false);
  assert.equal('id' in row, false);
  assert.equal(row.logo_path, null);
});

test('duplicar: nombre, cliente y etiquetas nuevos si se dan', () => {
  const row = buildDuplicate(sourceRow(), { name: 'Beta', client: '', tags: ['app'] });
  assert.equal(row.name, 'Beta');
  assert.equal(row.client, null);
  assert.deepEqual(row.tags, ['app']);
});

// ── Guardar ──────────────────────────────────────────────────────────────────

const STAMP = '2026-09-15T21:30:00.123456+00:00';

test('guardar: sin expectedUpdatedAt no hay forma de detectar conflictos y se rechaza', () => {
  const res = buildPatch({ status: 'published' }, ID);
  assert.equal(res.ok, false);
});

test('guardar: marca y ajustes recalculan tokens y espejos en el servidor', () => {
  const brand = { ...defaultBrand(), name: 'Nuevo' };
  const res = buildPatch({ expectedUpdatedAt: STAMP, engineVersion: ENGINE_VERSION, brand, overrides: { radius: { md: 5 } } }, ID);
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.expectedUpdatedAt, STAMP);
  assert.equal(res.patch.name, 'Nuevo');
  assert.equal(res.patch.engine_version, ENGINE_VERSION);
  assert.deepEqual(res.patch.tokens, composeTokens(brand, { radius: { md: 5 } }).tokens);
});

test('guardar: la marca va siempre con sus ajustes, y con el motor del servidor', () => {
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, engineVersion: ENGINE_VERSION, brand: defaultBrand() }, ID).ok, false);
  const stale = buildPatch({ expectedUpdatedAt: STAMP, engineVersion: '0', brand: defaultBrand(), overrides: {} }, ID);
  assert.equal(stale.ok, false);
  if (!stale.ok) assert.equal(stale.status, 409);
});

test('guardar: los tokens enviados por el cliente se ignoran', () => {
  const res = buildPatch({ expectedUpdatedAt: STAMP, status: 'published', tokens: { trampa: true } }, ID);
  assert.equal(res.ok, true);
  if (res.ok) assert.deepEqual(res.patch, { status: 'published' });
});

test('guardar: un logo solo puede apuntar al prefijo de su propio sistema', () => {
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, logo_path: `ds/${ID}/logo-1.png` }, ID).ok, true);
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, logo_path: null }, ID).ok, true);
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, logo_path: 'logos/1700000000-acme.svg' }, ID).ok, false);
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, logo_dark_path: `ds/${ID}/../../logos/x.svg` }, ID).ok, false);
});

test('guardar: estado, etiquetas y configuración se validan', () => {
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, status: 'archivado' }, ID).ok, false);
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, tags: 'web' }, ID).ok, false);
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP, configs: { button: { variant: 3 } } }, ID).ok, false);
  assert.equal(buildPatch({ expectedUpdatedAt: STAMP }, ID).ok, false);
});

// ── Listado y Storage ────────────────────────────────────────────────────────

test('listado: la tarjeta recibe la tira de color y no los JSONB', () => {
  const tokens = composeTokens(defaultBrand(), {}).tokens;
  const item = listItemFrom({
    id: ID, public_id: 'ds_abc', name: 'Acme', client: null, status: 'draft', tags: null, engine_version: '1',
    logo_path: null, created_at: STAMP, updated_at: STAMP, palette: tokens.palette,
  });
  assert.deepEqual(item.palette, [tokens.palette.primary['600'], tokens.palette.secondary['600'], tokens.palette.neutral['400']]);
  assert.deepEqual(item.tags, []);
  assert.equal('brand' in item, false);
});

test('borrar: solo se tocan ficheros bajo el prefijo del propio sistema', () => {
  assert.deepEqual(
    ownedLogoPaths({ logo_path: `ds/${ID}/logo-1.svg`, logo_dark_path: 'logos/ajeno.svg' }, ID),
    [`ds/${ID}/logo-1.svg`],
  );
  assert.deepEqual(ownedLogoPaths({ logo_path: null, logo_dark_path: null }, ID), []);
});

test('isUuid: un id mal formado no llega a la base de datos (sería un 500 en vez de un 404)', () => {
  assert.equal(isUuid(ID), true);
  assert.equal(isUuid('ds_abc'), false);
  assert.equal(isUuid(`${ID}'; drop table x`), false);
});

test('ruta del logo: prefijo, marca de tiempo y nombre saneado', () => {
  assert.equal(logoObjectPath('logos', 'Mi logo (final).svg', 1700000000000), 'logos/1700000000000-Mi_logo__final_.svg');
  assert.equal(logoObjectPath(`ds/${ID}`, 'a.png', 1), `ds/${ID}/1-a.png`);
});
