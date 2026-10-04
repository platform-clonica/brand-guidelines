import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEditPrompt, INSTRUCTION_MAX } from '../edit/prompt.ts';
import { getImagePrompt } from '../../prompts.ts';

/* El prompt de edición (docs/features/img-r.md, «Edición con Gemini»): una orden de retoque, el prompt de la
   guía completo y la indicación de la persona. getImagePrompt() se usa tal cual; su salida está congelada en
   lib/__tests__/prompts.test.ts. */

test('con standard lleva el prompt estándar de la guía completo; con people, el de personas', () => {
  assert.ok(buildEditPrompt('standard').includes(getImagePrompt('es', 'standard')));
  assert.ok(buildEditPrompt('people').includes(getImagePrompt('es', 'people')));
  assert.ok(!buildEditPrompt('standard').includes(getImagePrompt('es', 'people')));
});

test('es una edición, no una generación, y conserva el encuadre en las dos variantes', () => {
  for (const v of ['standard', 'people'] as const) {
    const p = buildEditPrompt(v);
    assert.ok(p.startsWith('Esto es una edición de una fotografía existente, no una imagen nueva.'));
    assert.ok(p.includes('Conserva el encuadre'));
  }
});

test('la orden de conservar a las personas solo va con people', () => {
  assert.ok(buildEditPrompt('people').includes('Conserva también a las personas'));
  assert.ok(!buildEditPrompt('standard').includes('Conserva también a las personas'));
});

test('la indicación va al final, recortada a 300 caracteres; sin indicación no hay línea', () => {
  assert.equal(INSTRUCTION_MAX, 300);
  const largo = 'x'.repeat(400);
  const p = buildEditPrompt('standard', `  ${largo}  `);
  assert.ok(p.endsWith(`Indicación de la persona: ${'x'.repeat(300)}`));
  assert.ok(!buildEditPrompt('standard', '   ').includes('Indicación'));
  assert.ok(!buildEditPrompt('standard').includes('Indicación'));
});
