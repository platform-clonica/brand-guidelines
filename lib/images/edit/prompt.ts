import { getImagePrompt, type ImagePromptVariant } from '../../prompts.ts';

/* El prompt de «Editar con IA» (docs/features/img-r.md, «Edición con Gemini»), en tres bloques:

   1. La orden de retoque: es una edición de una foto que existe, no una imagen nueva. Con la variante
      `people`, conservar también a las personas.
   2. El prompt de la guía COMPLETO, getImagePrompt('es', variante), tal cual: el equipo y un cliente lo
      usan a diario, y su salida está congelada en lib/__tests__/prompts.test.ts.
   3. La indicación libre de la persona, si la hay, de 300 caracteres como máximo. */

export const INSTRUCTION_MAX = 300;

const ORDER =
  'Esto es una edición de una fotografía existente, no una imagen nueva. Conserva el encuadre, la composición, la perspectiva y los elementos de la escena.';
const KEEP_PEOPLE = 'Conserva también a las personas: cuántas son, dónde están, sus rasgos, su ropa y sus gestos.';
const APPLY = 'Aplica solo el tratamiento fotográfico que se describe a continuación.';

export function buildEditPrompt(variant: ImagePromptVariant, instruction = ''): string {
  const order = [ORDER, variant === 'people' ? KEEP_PEOPLE : null, APPLY].filter(Boolean).join(' ');
  const ins = instruction.trim().slice(0, INSTRUCTION_MAX);
  return [order, getImagePrompt('es', variant), ins ? `Indicación de la persona: ${ins}` : null].filter(Boolean).join('\n\n');
}
