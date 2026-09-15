import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultConfig, getComponent, resolveProps } from '../components.ts';
import { clearProp, resetComponent, setAnatomy, setAxis, setNote, setProp } from '../configs.ts';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import { resolveTokens } from '../engine/resolve.ts';
import type { Configs } from '../schema.ts';

const resolved = resolveTokens(composeTokens(defaultBrand(), {}).tokens, 'light');
const button = getComponent('button')!;
const badge = getComponent('badge')!;

test('tocar un eje guarda el componente; volver al valor por defecto lo quita', () => {
  const c = setAxis({}, button, 'size', 'LG');
  assert.deepEqual(c, { button: { ...defaultConfig(button), size: 'LG' } });
  assert.deepEqual(setAxis(c, button, 'size', 'MD'), {});
});

test('un valor que el eje no tiene, o un eje que el componente no tiene, no cambian nada', () => {
  const c: Configs = {};
  assert.equal(setAxis(c, button, 'variant', 'Fantasma'), c);
  assert.equal(setAxis(c, button, 'intention', 'Primary'), c);
});

test('anatomía: solo opciones del catálogo y del tipo que toca', () => {
  const c = setAnatomy({}, button, 'width', 'Ancho completo');
  assert.equal(c.button.anatomy.width, 'Ancho completo');
  assert.equal(setAnatomy(c, button, 'width', 'Enorme'), c);
  assert.equal(setAnatomy(c, button, 'width', true), c);
  assert.equal(setAnatomy(c, button, 'inventada', 'x'), c);
  assert.equal(setAnatomy({}, getComponent('input')!, 'counter', true).input.anatomy.counter, true);
});

test('props: se guarda solo lo que difiere del valor calculado, y gana en cualquier talla', () => {
  const c = setProp({}, button, resolved, 'padX', 40);
  assert.deepEqual(c.button.props, { padX: 40 });
  assert.equal(resolveProps(button, resolved, setAxis(c, button, 'size', 'LG').button).padX, 40);
  // 26 es el padding calculado en MD: escribirlo a mano es volver al del sistema.
  assert.deepEqual(setProp(c, button, resolved, 'padX', 26), {});
  assert.deepEqual(clearProp(c, button, 'padX'), {});
});

test('props: una prop que el componente no tiene o un valor que no encaja no cambian nada', () => {
  const c: Configs = {};
  assert.equal(setProp(c, button, resolved, 'inventada', 3), c);
  assert.equal(setProp(c, button, resolved, 'radiusToken', 'enorme'), c);
  assert.equal(setProp(c, button, resolved, 'padX', 'mucho'), c);
});

test('nota y restablecer: restablecer deja el componente sin tocar y respeta los demás', () => {
  let c = setNote({}, button, 'Escala en hover');
  c = setAxis(c, badge, 'variant', 'Outline');
  assert.equal(c.button.note, 'Escala en hover');
  assert.equal(setNote(c, button, '').button, undefined);

  const reset = resetComponent(c, 'button');
  assert.equal(reset.button, undefined);
  assert.equal(reset.badge.variant, 'Outline');
});
