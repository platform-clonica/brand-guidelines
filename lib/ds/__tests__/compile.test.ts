import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileSystem, type DsIssue } from '../compile.ts';
import { defaultConfig, getComponent } from '../components.ts';
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

test('una configuración de componente válida se conserva tal cual y sin incidencias', () => {
  const button = getComponent('button')!;
  const configs = { button: { ...defaultConfig(button), size: 'LG', props: { padX: 40, radiusToken: 'full' }, note: 'Escala en hover' } };
  const res = compileSystem({ ...validRow(), configs });
  assert.deepEqual(res.issues, []);
  assert.deepEqual(res.system?.configs, configs);
});

test('un componente que no está en el catálogo se ignora con aviso', () => {
  const res = compileSystem({ ...validRow(), configs: { carrusel: defaultConfig(getComponent('button')!) } });
  assert.equal(find(res.issues, 'configs.carrusel')?.level, 'warning');
  assert.deepEqual(res.system?.configs, {});
});

test('ejes, anatomía y props que no encajan se reparan campo a campo, con su ruta', () => {
  const button = getComponent('button')!;
  const res = compileSystem({
    ...validRow(),
    configs: {
      button: {
        ...defaultConfig(button),
        variant: 'Fantasma',
        intention: 'Primary',
        size: 'LG',
        anatomy: { icon: 'Derecha', width: 'Full width', inventada: true },
        props: { gap: 7, padX: 'mucho', radiusToken: 'enorme', inventada: 3 },
      },
    },
  });
  const c = res.system!.configs.button;
  assert.equal(c.variant, 'Primary');
  assert.equal(c.intention, null);
  assert.equal(c.size, 'LG');
  assert.deepEqual(c.anatomy, { icon: 'Derecha', width: 'Ajustado' });
  assert.deepEqual(c.props, { gap: 7 });
  for (const path of [
    'configs.button.variant', 'configs.button.intention', 'configs.button.anatomy.width', 'configs.button.anatomy.inventada',
    'configs.button.props.padX', 'configs.button.props.radiusToken', 'configs.button.props.inventada',
  ]) {
    assert.equal(find(res.issues, path)?.level, 'warning', path);
  }
  assert.equal(res.ok, true);
});

test('una opción de anatomía que el catálogo añadió después se rellena sin aviso', () => {
  const button = getComponent('button')!;
  const res = compileSystem({ ...validRow(), configs: { button: { ...defaultConfig(button), anatomy: { icon: 'Izquierda' } } } });
  assert.deepEqual(res.system?.configs.button.anatomy, { icon: 'Izquierda', width: 'Ajustado' });
  assert.deepEqual(res.issues, []);
});

test('tokens guardados dañados: error y sin tokens, para que el editor pida regenerar', () => {
  const res = compileSystem({ ...validRow(), tokens: { palette: 'x' } });
  assert.equal(res.ok, false);
  assert.equal(res.system?.tokens, null);
  assert.equal(find(res.issues, 'tokens')?.level, 'error');
});
