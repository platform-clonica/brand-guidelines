import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPONENTS,
  componentAxes,
  componentSummary,
  configFor,
  defaultConfig,
  getComponent,
  isValidProp,
  propControl,
  resolveProps,
} from '../components.ts';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand, RADIUS_NAMES, SHADOW_NAMES } from '../engine/presets.ts';
import { resolveTokens } from '../engine/resolve.ts';
import { componentConfigSchema } from '../schema.ts';

const resolved = resolveTokens(composeTokens(defaultBrand(), {}).tokens, 'light');

test('el catálogo tiene los 17 componentes del prototipo, en su orden', () => {
  assert.deepEqual(COMPONENTS.map((c) => c.key), [
    'accordion', 'badge', 'button', 'checkbox', 'dropdown', 'input', 'link', 'modal', 'notification',
    'pagination', 'radio', 'search', 'slider', 'switch', 'tags', 'toggle', 'tooltip',
  ]);
});

test('toda prop calculada tiene etiqueta y es número o nombre de token', () => {
  for (const spec of COMPONENTS) {
    const props = spec.props(resolved, 1);
    for (const [key, value] of Object.entries(props)) {
      assert.ok(spec.propMeta[key], `${spec.key}.${key} sin etiqueta`);
      assert.ok(typeof value === 'string' || Number.isFinite(value), `${spec.key}.${key} = ${value}`);
    }
  }
});

test('los valores por defecto de la anatomía están entre sus opciones', () => {
  for (const spec of COMPONENTS) {
    for (const [key, a] of Object.entries(spec.anatomy)) {
      if (a.type === 'select') assert.ok(a.options.includes(a.def), `${spec.key}.${key}`);
      else assert.equal(typeof a.def, 'boolean', `${spec.key}.${key}`);
    }
  }
});

test('la anatomía no mezcla idiomas: las opciones van en castellano', () => {
  const english = [
    'Chevron', 'Plus / Minus', 'Full', 'Sharp', 'Hug', 'Full width', 'External', 'Floating', 'Square', 'Rounded',
    'Circle', 'Pill', 'Segmented', 'Outlined', 'Top', 'Bottom', 'Left', 'Right',
  ];
  for (const spec of COMPONENTS) {
    for (const [key, a] of Object.entries(spec.anatomy)) {
      if (a.type !== 'select') continue;
      for (const option of a.options) assert.ok(!english.includes(option), `${spec.key}.${key}: ${option}`);
    }
  }
});

test('la configuración por defecto es válida y no guarda props: solo lo que el diseñador cambie', () => {
  for (const spec of COMPONENTS) {
    const config = defaultConfig(spec);
    assert.equal(componentConfigSchema.safeParse(config).success, true, spec.key);
    assert.deepEqual(config.props, {});
  }
});

test('la configuración por defecto elige MD, la segunda intención y el primer estado', () => {
  const badge = defaultConfig(getComponent('badge')!);
  assert.equal(badge.variant, 'Solid');
  assert.equal(badge.intention, 'Primary');
  assert.equal(badge.size, 'MD');
  const modal = defaultConfig(getComponent('modal')!);
  assert.equal(modal.size, 'Medium');
  assert.equal(modal.state, null);
});

test('configuración efectiva: la guardada, o la de por defecto si el componente no se ha tocado', () => {
  const button = getComponent('button')!;
  const saved = { ...defaultConfig(button), size: 'LG' };
  assert.equal(configFor({ button: saved }, button), saved);
  assert.deepEqual(configFor({}, button), defaultConfig(button));
});

test('las props salen de los tokens y la talla, y lo editado a mano gana en cualquier talla', () => {
  const button = getComponent('button')!;
  const md = resolveProps(button, resolved, { ...defaultConfig(button), size: 'MD' });
  const lg = resolveProps(button, resolved, { ...defaultConfig(button), size: 'LG' });
  assert.equal(md.padX, 26);
  assert.equal(lg.padX, 29);
  assert.equal(md.radiusToken, 'md');
  const edited = { ...defaultConfig(button), size: 'LG', props: { padX: 40, radiusToken: 'full', inventada: 3 } };
  const out = resolveProps(button, resolved, edited);
  assert.equal(out.padX, 40);
  assert.equal(out.radiusToken, 'full');
  assert.equal(out.inventada, undefined);
});

test('cada prop dice con qué control se edita', () => {
  assert.deepEqual(propControl('radiusToken'), { kind: 'radius' });
  assert.deepEqual(propControl('menuRadiusToken'), { kind: 'radius' });
  assert.deepEqual(propControl('elevation'), { kind: 'shadow' });
  assert.deepEqual(propControl('thumbShadow'), { kind: 'shadow' });
  assert.deepEqual(propControl('backdropOpacity'), { kind: 'number', min: 0, max: 1 });
  assert.deepEqual(propControl('padX'), { kind: 'number', min: 0, max: 999 });
});

test('toda prop calculada encaja con su control', () => {
  for (const spec of COMPONENTS) {
    for (const size of [0.86, 1, 1.14]) {
      for (const [key, value] of Object.entries(spec.props(resolved, size))) {
        assert.ok(isValidProp(key, value), `${spec.key}.${key} = ${value}`);
      }
    }
  }
  assert.ok((RADIUS_NAMES as readonly string[]).includes('md'));
  assert.ok((SHADOW_NAMES as readonly string[]).includes('lg'));
});

test('una prop con un valor que no encaja con su control no es válida', () => {
  assert.equal(isValidProp('radiusToken', 'enorme'), false);
  assert.equal(isValidProp('radiusToken', 4), false);
  assert.equal(isValidProp('elevation', 'gigante'), false);
  assert.equal(isValidProp('padX', 'mucho'), false);
  assert.equal(isValidProp('padX', -1), false);
  assert.equal(isValidProp('padX', Number.NaN), false);
  assert.equal(isValidProp('backdropOpacity', 1.5), false);
  assert.equal(isValidProp('padX', 12.5), true);
});

test('ejes en orden variante, intención, tamaño y estado, y resumen en castellano', () => {
  const badge = getComponent('badge')!;
  assert.deepEqual(componentAxes(badge).map((a) => a.key), ['variant', 'intention', 'size']);
  assert.equal(componentSummary(badge), '18 variantes · 2 tamaños');
  assert.equal(componentSummary(getComponent('button')!), '4 variantes · 3 tamaños · 6 estados');
  assert.equal(componentSummary(getComponent('checkbox')!), '2 tamaños · 7 estados');
});

test('los tokens resueltos exponen espaciado, texto, radios y sombras por nombre', () => {
  assert.equal(resolved.sp.md, 24);
  assert.equal(resolved.ty['body-s'].size, 14);
  assert.equal(resolved.rad.full, '999px');
  assert.equal(resolved.sh.md, '0px 4px 8px 0px rgba(34, 37, 41, 0.08)');
  assert.equal(resolved.dark, false);
  assert.equal(resolved.heading, '"IBM Plex Serif", Georgia, serif');
});

test('una familia tipográfica con comillas no rompe la pila de fuentes', () => {
  const tokens = composeTokens(defaultBrand(), {}).tokens;
  tokens.fonts.heading = 'Mala"; background: red';
  assert.ok(!resolveTokens(tokens, 'light').heading.includes('";'));
});
