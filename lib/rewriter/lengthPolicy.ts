/* ReWrit_r — la política de longitud de frase por tipo de texto.

   `lib/eval.ts` es agnóstico al formato: aplica 15–22 palabras a toda frase. Eso es correcto para
   prosa y falso para un titular de diapositiva o un mensaje de chat, donde el fragmento es la
   forma buena. Sin este filtro, un mensaje impecable de cinco frases cortas saca 50/100 y el
   usuario aprende a ignorar el indicador.

   Qué NO hace, a propósito:
   - No toca `length:over_max`. Una frase de 47 palabras sigue siendo mala en una portada de deck,
     y el ejemplo aprobado `deck-cover` de lib/tokens.ts se mueve en 21–22 palabras: suprimir el
     techo contradiría material ya aprobado.
   - No cambia `hardFail`. Las violaciones de longitud ya eran blandas. Lo único que se corrige es
     el número que se pinta, no el aprobado.

   La decisión sale de `allowFragments`, el mismo campo de TEXT_TYPES que relaja la regla en el
   prompt. Una sola fuente para lo que se pide y para lo que se puntúa. */

import { hardFailFor, scoreFor, type EvalResult } from '../eval.ts';
import { textTypeOption, type TextType } from './options.ts';

export function applyLengthPolicy(result: EvalResult, textType: TextType): EvalResult {
  if (!textTypeOption(textType).allowFragments) return result;

  const violations = result.violations.filter((v) => v.rule !== 'length:under_min');
  if (violations.length === result.violations.length) return result;

  return {
    ...result,
    violations,
    score: scoreFor(violations),
    hardFail: hardFailFor(violations),
  };
}
