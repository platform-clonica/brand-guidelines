import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeTokens } from '../engine/index.ts';
import { defaultBrand } from '../engine/presets.ts';
import {
  addFamily,
  clearOverrideEntry,
  clearOverrideSection,
  clearRampTweak,
  clearSwatchesUnder,
  setRadiusMapOverride,
  clearSemanticBase,
  clearSwatch,
  clearTypeOverride,
  lockFamily,
  randomRampTweak,
  removeFamily,
  renameFamily,
  setRadiusOverride,
  setRampTweak,
  setSemanticBase,
  setShadowOverride,
  setSpacingOverride,
  setSwatch,
  setTypeOverride,
  unlockFamily,
} from '../edit.ts';
import type { Overrides } from '../schema.ts';

// ── Muestras, bloqueos y variación ───────────────────────────────────────────

test('muestra: se fija, gana al motor, y al quitarla desaparece la sección si queda vacía', () => {
  const o = setSwatch({}, 'palette.primary.500', '#123456');
  assert.equal(composeTokens(defaultBrand(), o).tokens.palette.primary['500'], '#123456');
  assert.deepEqual(clearSwatch(o, 'palette.primary.500'), {});
  assert.deepEqual(clearSwatch(setSwatch(o, 'palette.primary.600', '#000000'), 'palette.primary.500'), {
    swatches: { 'palette.primary.600': '#000000' },
  });
});

test('editar no muta el objeto de partida', () => {
  const o: Overrides = { swatches: { 'palette.primary.500': '#111111' } };
  const frozen = structuredClone(o);
  setSwatch(o, 'palette.primary.600', '#222222');
  clearSwatch(o, 'palette.primary.500');
  lockFamily(o, 'primary', composeTokens(defaultBrand(), {}).tokens.palette.primary);
  assert.deepEqual(o, frozen);
});

test('bloqueo: congela la rampa actual y cambiar el primario ya no la toca', () => {
  const brand = defaultBrand();
  const ramp = composeTokens(brand, {}).tokens.palette.primary;
  const o = lockFamily({}, 'primary', ramp);
  const other = { ...brand, colors: { ...brand.colors, primary: '#FF0000' } };
  assert.deepEqual(composeTokens(other, o).tokens.palette.primary, ramp);
  assert.deepEqual(unlockFamily(o, 'primary'), {});
});

test('variación de rampa: se guarda, se reproduce y está dentro del esquema', () => {
  const tweak = randomRampTweak(() => 0.5);
  assert.deepEqual(tweak, { chromaBoost: 1.08, hueShift: 0 });
  assert.deepEqual(randomRampTweak(() => 0), { chromaBoost: 0.9, hueShift: -5 });
  assert.deepEqual(randomRampTweak(() => 0.9999999), { chromaBoost: 1.25, hueShift: 5 });
  const o = setRampTweak({}, 'secondary', tweak);
  assert.deepEqual(composeTokens(defaultBrand(), o).tokens, composeTokens(defaultBrand(), o).tokens);
  assert.deepEqual(clearRampTweak(o, 'secondary'), {});
});

test('semánticos: color base propio y vuelta al del motor', () => {
  const o = setSemanticBase({}, 'error', '#99335F');
  assert.equal(composeTokens(defaultBrand(), o).tokens.semantic.error['500'] !== undefined, true);
  assert.deepEqual(clearSemanticBase(o, 'error'), {});
});

// ── Escalas ──────────────────────────────────────────────────────────────────

test('tipografía: un campo por rol; quitar el rol limpia la sección', () => {
  let o = setTypeOverride({}, 'h1', 'size', 40);
  o = setTypeOverride(o, 'h1', 'weight', 300);
  const h1 = composeTokens(defaultBrand(), o).tokens.typography.find((t) => t.key === 'h1');
  assert.equal(h1?.size, 40);
  assert.equal(h1?.weight, 300);
  assert.deepEqual(clearTypeOverride(o, 'h1'), {});
});

test('espaciado, radios y sombras se fijan y se limpian por sección', () => {
  let o = setSpacingOverride({}, 'md', 20);
  o = setRadiusOverride(o, 'md', 6);
  o = setShadowOverride(o, 'lg', 'blur', 30);
  const t = composeTokens(defaultBrand(), o).tokens;
  assert.equal(t.spacing.find((s) => s.name === 'md')?.value, 20);
  assert.equal(t.radius.md, 6);
  assert.equal(t.shadows.find((s) => s.name === 'lg')?.blur, 30);
  assert.deepEqual(clearOverrideSection(clearOverrideSection(clearOverrideSection(o, 'spacing'), 'radius'), 'shadows'), {});
});

test('entradas sueltas: radio por componente, quitar un ajuste y los retoques de una familia', () => {
  let o = setRadiusMapOverride({}, 'button', 'lg');
  assert.equal(composeTokens(defaultBrand(), o).tokens.radiusMap.button, 'lg');
  o = setSpacingOverride(o, 'md', 20);
  assert.deepEqual(clearOverrideEntry(clearOverrideEntry(o, 'radiusMap', 'button'), 'spacing', 'md'), {});

  let s = setSwatch({}, 'palette.primary.500', '#111111');
  s = setSwatch(s, 'palette.primary.600', '#222222');
  s = setSwatch(s, 'palette.secondary.500', '#333333');
  assert.deepEqual(clearSwatchesUnder(s, 'palette.primary.'), { swatches: { 'palette.secondary.500': '#333333' } });
});

// ── Familias de color ────────────────────────────────────────────────────────

test('añadir familia: nombre libre válido para CSS y que no pisa ninguna existente', () => {
  const brand = defaultBrand();
  const a = addFamily(brand, '#00AA00');
  assert.equal(a.family, 'custom1');
  assert.equal(a.brand.colors.custom1, '#00AA00');
  const b = addFamily(a.brand, '#0000AA');
  assert.equal(b.family, 'custom2');
  assert.equal(brand.colors.custom1, undefined, 'no muta la marca');
});

test('renombrar familia: mueve sus ajustes y rechaza nombres inválidos, reservados o repetidos', () => {
  const { brand } = addFamily(defaultBrand(), '#00AA00');
  const ramp = composeTokens(brand, {}).tokens.palette.custom1;
  const o: Overrides = {
    swatches: { 'palette.custom1.500': '#111111', 'palette.primary.500': '#222222' },
    locks: { custom1: ramp },
    rampTweaks: { custom1: { chromaBoost: 1, hueShift: 2 } },
  };
  const res = renameFamily(brand, o, 'custom1', 'marca-2');
  assert.equal(res.ok, true);
  if (!res.ok) return;
  assert.equal(res.brand.colors['marca-2'], '#00AA00');
  assert.equal(res.brand.colors.custom1, undefined);
  assert.deepEqual(res.overrides.swatches, { 'palette.marca-2.500': '#111111', 'palette.primary.500': '#222222' });
  assert.deepEqual(Object.keys(res.overrides.locks ?? {}), ['marca-2']);
  assert.deepEqual(Object.keys(res.overrides.rampTweaks ?? {}), ['marca-2']);
  assert.deepEqual(composeTokens(res.brand, res.overrides).orphans, []);

  assert.equal(renameFamily(brand, o, 'custom1', 'Mi Color').ok, false);
  assert.equal(renameFamily(brand, o, 'custom1', 'error').ok, false);
  assert.equal(renameFamily(brand, o, 'custom1', 'secondary').ok, false);
  assert.equal(renameFamily(brand, o, 'primary', 'principal').ok, false);
  const same = renameFamily(brand, o, 'custom1', 'custom1');
  assert.equal(same.ok, true);
});

test('quitar familia: se lleva sus ajustes para no dejar huérfanos; primario y secundario no se quitan', () => {
  const { brand } = addFamily(defaultBrand(), '#00AA00');
  const o: Overrides = {
    swatches: { 'palette.custom1.500': '#111111' },
    rampTweaks: { custom1: { chromaBoost: 1, hueShift: 2 } },
  };
  const res = removeFamily(brand, o, 'custom1');
  assert.equal(res.brand.colors.custom1, undefined);
  assert.deepEqual(res.overrides, {});
  assert.deepEqual(composeTokens(res.brand, res.overrides).orphans, []);
  assert.equal(removeFamily(brand, o, 'primary').brand.colors.primary, brand.colors.primary);
});
