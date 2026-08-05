import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* Guardia de regresión del prompt de imagen.

   El cliente lleva meses usando la variante de personas y está contento con lo que le devuelve.
   Cualquier retoque en el cuerpo (modo operativo · película · óptica · luz · obturación) le cambia
   las imágenes, así que estos literales están congelados: si alguien los edita, este test cae y
   obliga a que sea una decisión y no un descuido.

   Se lee el fichero como TEXTO en vez de importarlo: lib/prompts.ts usa alias `@/…` y el runner
   (`node --test --experimental-strip-types`) no los resuelve. Para lo que hace falta aquí —que unos
   literales no cambien— leer el fuente basta y no arrastra dependencias. */

const SRC = readFileSync(new URL('../prompts.ts', import.meta.url), 'utf8');

/* Cuerpo compartido por AMBAS variantes: es lo que fija el tono de marca. */
const BODY_LINES_ES = [
  'Modo operativo: Generar fotografía editorial premium de estilo analógico. El tono visual debe ser sobrio, crítico y sugerente, huyendo por completo de la estética de los bancos de imágenes tradicionales.',
  '- Tipo de película: Fotografía analógica de 35mm (grano fino perceptible, estilo cromático sutil de Kodak Portra 400). Cero renders 3D o texturas digitales pulidas.',
  '- Óptica: Lente prime (35mm o 50mm). Profundidad de campo muy baja (fondo suavemente desenfocado).',
  '- Iluminación: Luz natural, lateral o difusa. Evitar una iluminación de estudio homogénea o artificial.',
  '- Obturación: Velocidad de obturación lenta deliberada (1/15s - 1/60s). Se busca capturar un movimiento sutil, un barrido o una ligera estela de luz (ghosting).',
];

/* Las negaciones se quedan: el cliente genera con ChatGPT (GPT-image) y Nano Banana (Gemini), los
   dos con un LLM delante que sí procesa una negación. El riesgo de "nombrar algo lo invoca" es de
   los modelos de difusión pura, no de estos. Si algún día cambian de herramienta, revisar. */
test('las negaciones del cuerpo siguen ahí', () => {
  assert.ok(SRC.includes('huyendo por completo de la estética de los bancos de imágenes tradicionales'));
  assert.ok(SRC.includes('Cero renders 3D o texturas digitales pulidas'));
});

/* Kodak Portra 400 existe; "Portra 400H" era un cruce con la Fuji Pro 400H, que tira al lado
   contrario en color. No volver a introducirlo. */
test('el nombre de la película es real y no el híbrido Kodak/Fuji', () => {
  assert.ok(!SRC.includes('Portra 400H'), 'Portra 400H no existe: es un cruce de Kodak Portra 400 y Fuji Pro 400H');
});

/* Las cabeceras no prometen composición: la regla de composición se eliminó y dejarlas
   anunciándola empujaba al modelo hacia lo conceptual. */
test('las cabeceras de sujeto no arrastran la composición eliminada', () => {
  for (const escombro of ['COMPOSICIÓN EN EL MARGEN', 'COMPOSITION AT THE MARGIN', 'COMPOSICIÓ AL MARGE']) {
    assert.ok(!SRC.includes(escombro), `cabecera huérfana: ${escombro}`);
  }
});

for (const line of BODY_LINES_ES) {
  test(`el cuerpo del prompt sigue intacto: ${line.slice(0, 44)}…`, () => {
    assert.ok(SRC.includes(line), 'esta línea sostiene el tono y no debe cambiarse sin decisión explícita');
  });
}

test('la variante de personas es la que el cliente ya usa, palabra por palabra', () => {
  assert.ok(
    SRC.includes(
      '- Sujetos: Personas reales en entornos profesionales nunca posando, nunca mirando a cámara, nunca sonriendo de forma corporativa.',
    ),
  );
});

test('la variante estándar excluye personas de forma explícita, no por omisión', () => {
  // Callarse no basta: sin negativa expresa el generador mete figuras humanas igualmente.
  assert.ok(SRC.includes('Ninguna figura humana en el encuadre'));
  // Y la negativa tiene que ser exhaustiva: los parciales son los que se cuelan.
  for (const parcial of ['sin manos', 'sin siluetas', 'sin reflejos de personas', 'sin sombras humanas proyectadas']) {
    assert.ok(SRC.includes(parcial), `falta la exclusión parcial: ${parcial}`);
  }
});

test('la variante estándar nombra un sujeto no humano (no solo prohíbe)', () => {
  // Un prompt que solo niega deja al modelo sin nada que retratar.
  assert.ok(SRC.includes('Espacios y objetos sin presencia humana'));
});
