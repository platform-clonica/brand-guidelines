import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileSystem, type DsIssue } from '../compile.ts';
import { composeTokens, ENGINE_VERSION } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';

const validRow = () => {
  const brand = defaultBrand();
  return { brand, overrides: {}, configs: {}, tokens: composeTokens(brand, {}).tokens, engine_version: ENGINE_VERSION };
};

const find = (issues: DsIssue[], path: string) => issues.find((i) => i.path === path);

test('una fila válida compila sin incidencias y sin cambios', () => {
  const row = validRow();
  const res = compileSystem(row);
  assert.equal(res.ok, true);
  assert.deepEqual(res.issues, []);
  assert.equal(res.engineMismatch, false);
  assert.deepEqual(res.system, { brand: row.brand, overrides: row.overrides, configs: row.configs, tokens: row.tokens });
});

test('nunca lanza, le llegue lo que le llegue', () => {
  const junk: unknown[] = [null, undefined, 'x', 42, [], {}, { brand: { colors: 'rojo' } }, { brand: [], tokens: 'no' }];
  for (const row of junk) assert.doesNotThrow(() => compileSystem(row), `lanzó con ${JSON.stringify(row)}`);
});

test('un campo de marca inválido se repone con el valor por defecto y se anota con su ruta', () => {
  const row = validRow();
  const res = compileSystem({ ...row, brand: { ...row.brand, baseSize: 'grande', fonts: undefined } });
  assert.equal(res.system?.brand.baseSize, 16);
  assert.equal(res.system?.brand.fonts.heading, 'IBM Plex Serif');
  assert.equal(find(res.issues, 'brand.baseSize')?.level, 'warning');
  assert.equal(find(res.issues, 'brand.fonts')?.level, 'warning');
});

test('sin un primario válido no hay sistema que abrir', () => {
  const row = validRow();
  const res = compileSystem({ ...row, brand: { ...row.brand, colors: { primary: 'azul', secondary: '#FFFFFF' } } });
  assert.equal(res.ok, false);
  assert.equal(res.system, null);
  assert.equal(find(res.issues, 'brand.colors.primary')?.level, 'error');
});

test('un secundario ausente se repone y se avisa', () => {
  const row = validRow();
  const res = compileSystem({ ...row, brand: { ...row.brand, colors: { primary: '#2F5FD6' } } });
  assert.equal(res.system?.brand.colors.primary, '#2F5FD6');
  assert.match(res.system!.brand.colors.secondary, /^#[0-9A-F]{6}$/i);
  assert.equal(find(res.issues, 'brand.colors.secondary')?.level, 'warning');
});

test('motor antiguo: se señala y los tokens guardados NO se recalculan', () => {
  const row = validRow();
  row.tokens.palette.primary['500'] = '#ABCDEF';
  const res = compileSystem({ ...row, engine_version: '0' });
  assert.equal(res.engineMismatch, true);
  assert.equal(find(res.issues, 'engine_version')?.level, 'warning');
  assert.equal(res.system?.tokens?.palette.primary['500'], '#ABCDEF');
});

test('un breakpoint que pisa al anterior es un error', () => {
  const row = validRow();
  const breakpoints = row.brand.breakpoints.map((b) => ({ ...b }));
  breakpoints[1].min = 700;
  const res = compileSystem({ ...row, brand: { ...row.brand, breakpoints } });
  assert.equal(res.ok, false);
  assert.equal(find(res.issues, 'brand.breakpoints.1.min')?.level, 'error');
});

test('un nombre de familia reservado es un error y la familia no entra en el sistema', () => {
  const row = validRow();
  const res = compileSystem({ ...row, brand: { ...row.brand, colors: { ...row.brand.colors, error: '#FF0000' } } });
  assert.equal(find(res.issues, 'brand.colors.error')?.level, 'error');
  assert.equal(res.system?.brand.colors.error, undefined);
});

test('un nombre de familia que no sirve para CSS se descarta con aviso', () => {
  const row = validRow();
  const res = compileSystem({ ...row, brand: { ...row.brand, colors: { ...row.brand.colors, 'Mi Color': '#FF0000' } } });
  assert.ok(find(res.issues, 'brand.colors.Mi Color'));
  assert.equal(res.system?.brand.colors['Mi Color'], undefined);
});

test('una retícula sin breakpoint del mismo nombre se avisa', () => {
  const row = validRow();
  const grid = row.brand.grid.map((g) => ({ ...g }));
  grid[0].name = 'Móvil';
  const res = compileSystem({ ...row, brand: { ...row.brand, grid } });
  assert.equal(find(res.issues, 'brand.grid.0.name')?.level, 'warning');
});

test('un override huérfano se avisa con su ruta completa', () => {
  const res = compileSystem({ ...validRow(), overrides: { swatches: { 'palette.accent.500': '#123456' } } });
  assert.equal(find(res.issues, 'overrides.swatches.palette.accent.500')?.level, 'warning');
});

test('una sección de overrides inválida se descarta con aviso, las demás se conservan', () => {
  const res = compileSystem({ ...validRow(), overrides: { spacing: 'mucho', radius: { md: 5 } } });
  assert.ok(find(res.issues, 'overrides.spacing'));
  assert.equal(res.system?.overrides.spacing, undefined);
  assert.deepEqual(res.system?.overrides.radius, { md: 5 });
});

test('una configuración de componente inválida se descarta con aviso', () => {
  const res = compileSystem({ ...validRow(), configs: { button: { variant: 3 }, input: null } });
  assert.ok(find(res.issues, 'configs.button'));
  assert.ok(find(res.issues, 'configs.input'));
  assert.deepEqual(res.system?.configs, {});
});

test('tokens guardados dañados: error y sin tokens, para que el editor pida regenerar', () => {
  const res = compileSystem({ ...validRow(), tokens: { palette: 'x' } });
  assert.equal(res.ok, false);
  assert.equal(res.system?.tokens, null);
  assert.equal(find(res.issues, 'tokens')?.level, 'error');
});
