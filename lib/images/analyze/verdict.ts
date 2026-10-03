import type { StyleCriterionKey } from '../../prompts.ts';

/* El veredicto de estilo de una imagen, a partir de sus seis criterios.

   La regla es la de docs/features/img-r.md: «si» si cumple todos los criterios que aplican; «no» si
   falla la mayoría; «parcial» en el resto. El documento la dejaba al modelo, escrita en el prompt.
   La aplica el código porque en la prueba del plan el modelo dio «parcial» a un andén de metro con 4 de
   6 criterios fallidos: el modelo juzga cada criterio, y la cuenta se hace aquí, siempre igual.

   `null` es «no se puede juzgar en esta foto» y no cuenta para nada. Si no aplica ninguno, no se
   afirma que encaje: sale «parcial». */

export type StyleVerdict = 'si' | 'parcial' | 'no';
export type StyleChecks = Record<StyleCriterionKey, boolean | null>;

export function verdictFrom(checks: StyleChecks): StyleVerdict {
  const applicable = Object.values(checks).filter((v): v is boolean => v !== null);
  if (applicable.length === 0) return 'parcial';
  const failed = applicable.filter((v) => !v).length;
  if (failed === 0) return 'si';
  return failed * 2 > applicable.length ? 'no' : 'parcial';
}
