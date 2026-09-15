import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorsAccent, colorsBase, typography } from '../../tokens.ts';
import { composeTokens } from '../engine/index.ts';
import { brandSchema, overridesSchema } from '../schema.ts';
import { interactiusTemplate } from '../template.ts';

test('la plantilla es una marca válida con overrides válidos', () => {
  const { brand, overrides } = interactiusTemplate();
  assert.equal(brandSchema.safeParse(brand).success, true);
  assert.equal(overridesSchema.safeParse(overrides).success, true);
});

test('las familias tipográficas son las de lib/tokens.ts', () => {
  const { brand } = interactiusTemplate();
  assert.equal(brand.fonts.heading, typography.contrast.family);
  assert.equal(brand.fonts.body, typography.brand.family);
});

test('ningún peso generado se sale de los declarados para su familia', () => {
  const { brand, overrides } = interactiusTemplate();
  const { tokens } = composeTokens(brand, overrides);
  for (const t of tokens.typography) {
    const allowed: readonly number[] = t.family === 'heading' ? typography.contrast.weights : typography.brand.weights;
    assert.ok(allowed.includes(t.weight), `${t.key}: peso ${t.weight} fuera de ${allowed}`);
  }
});

test('los colores de marca salen de la paleta base, nunca de los acentos de servicio', () => {
  const { brand } = interactiusTemplate();
  const base = new Set(colorsBase.map((c) => c.hex));
  const accents = new Set(colorsAccent.map((c) => c.hex));
  for (const hex of Object.values(brand.colors)) {
    assert.ok(base.has(hex), `${hex} no está en colorsBase`);
    assert.ok(!accents.has(hex), `${hex} es un acento de servicio`);
  }
});

test('el semántico de error es Burdeos, su rol de interfaz declarado', () => {
  const bordeaux = colorsAccent.find((c) => c.uiRole)!;
  const { brand, overrides } = interactiusTemplate();
  assert.equal(overrides.semanticBase?.error, bordeaux.hex);
  const { tokens } = composeTokens(brand, overrides);
  assert.ok(Object.values(tokens.semantic.error).includes(bordeaux.hex));
});

test('la plantilla usa radios rectos', () => {
  assert.equal(interactiusTemplate().brand.radiusStyle, 'sharp');
});
