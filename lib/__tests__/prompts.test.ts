import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getImagePrompt } from '../prompts.ts';

/* Guardia de regresión del prompt de imagen.

   El cliente lleva meses usando la variante de personas y está contento con lo que le devuelve.
   Cualquier retoque en el cuerpo (modo operativo · película · óptica · luz · obturación) le cambia
   las imágenes, así que estos literales están congelados: si alguien los edita, este test cae y
   obliga a que sea una decisión y no un descuido.

   Los literales se buscan en el fuente leído como TEXTO, que es lo que dice cada test: «esta línea
   sigue ahí». Desde IMG_r (fase 2) el fichero también se importa —ya no usa el alias `@/` para
   lib/tokens— y el último test congela la SALIDA de getImagePrompt(), que es lo que reciben el
   cliente y el editor de imágenes. */

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

/* La salida entera, congelada. IMG_r (fase 2) manda este texto tal cual a Gemini para editar fotos y lo
   usa para juzgar el estilo; el cliente lo copia a diario. Un cambio en cualquiera de las seis
   combinaciones —también en inglés y en catalán, que no se usan en IMG_r— es una decisión, no un
   retoque: si es deliberado, se actualiza la huella aquí y se revisan los criterios de estilo
   (styleCriteria.test.ts). Huellas tomadas el 2 de octubre de 2026, antes de tocar el fichero. */
test('getImagePrompt devuelve el mismo texto que antes, en sus dos variantes y sus tres idiomas', () => {
  const FROZEN = {
    es: {
      standard: '14de4ca1db16d8b63247d63805613a013c81cf964e6b40f69d2c7ffc9037e51e',
      people: 'a7c3ce8853aca4c91c8756f47a34cd335750b7616847880b5b1915771aae7b59',
    },
    en: {
      standard: '5535233bb475f34e26dc6856d07d1ca21779e887e04624c2763f5efbae1f6a71',
      people: '2c8212072aa46f22440f2f6723b14bacb159579c418d07606c743b9bbb6213fd',
    },
    ca: {
      standard: '8c6fb7e5eab4cddcf5bd03bcedc2cdd8db42975271ac428f22eba3021c84e758',
      people: '8714be2e5a2dc2fa6adbe3901f9d1e7e65bac45a7f004fbe2145eb009bae3ecf',
    },
  } as const;
  for (const locale of ['es', 'en', 'ca'] as const) {
    for (const variant of ['standard', 'people'] as const) {
      const hash = createHash('sha256').update(getImagePrompt(locale, variant)).digest('hex');
      assert.equal(hash, FROZEN[locale][variant], `getImagePrompt('${locale}', '${variant}') ha cambiado`);
    }
  }
});
