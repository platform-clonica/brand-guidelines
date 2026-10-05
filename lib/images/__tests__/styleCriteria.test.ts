import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getImagePrompt, IMAGE_STYLE_CRITERIA, IMAGE_SUBJECT_CRITERION } from '../../prompts.ts';

/* Los criterios de estilo de IMG_r salen del prompt de imagen de la guía y lo citan literalmente. Si
   alguien cambia una línea del prompt, la cita deja de estar dentro y este test cae: obliga a revisar
   el criterio en vez de juzgar las fotos con una regla que ya no es la de la guía. */

test('los cinco criterios comunes citan una línea del cuerpo, presente en las dos variantes', () => {
  assert.deepEqual(
    IMAGE_STYLE_CRITERIA.map((c) => c.key),
    ['film', 'dof', 'light', 'motion', 'not_stock'],
  );
  for (const c of IMAGE_STYLE_CRITERIA) {
    for (const variant of ['standard', 'people'] as const) {
      assert.ok(getImagePrompt('es', variant).includes(c.quote), `«${c.quote}» ya no está en el prompt ${variant}`);
    }
  }
});

test('el sexto criterio cita el bloque de sujeto de su variante, y solo de la suya', () => {
  for (const [variant, other] of [['people', 'standard'], ['standard', 'people']] as const) {
    const { quote } = IMAGE_SUBJECT_CRITERION[variant];
    assert.ok(getImagePrompt('es', variant).includes(quote), `«${quote}» ya no está en el prompt ${variant}`);
    assert.ok(!getImagePrompt('es', other).includes(quote), `«${quote}» también aparece en el prompt ${other}`);
  }
});

test('las etiquetas son las de la interfaz (F25 del documento)', () => {
  assert.deepEqual(
    [...IMAGE_STYLE_CRITERIA.map((c) => c.label), IMAGE_SUBJECT_CRITERION.people.label, IMAGE_SUBJECT_CRITERION.standard.label],
    [
      'Película analógica: grano fino y color tipo Portra',
      'Poca profundidad de campo',
      'Luz natural, lateral o difusa',
      'Movimiento o barrido sutil',
      'Lejos de la estética de banco de imágenes',
      'Personas sin posar, sin mirar a cámara ni sonreír de forma corporativa',
      'El sujeto es el espacio, los objetos o la luz, sin figuras humanas',
    ],
  );
});
