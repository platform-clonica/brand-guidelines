import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { inline } from '@/components/deck/inline';

/* Una cita a toda la tarjeta, entre comillas, con la firma pequeña debajo.

   LAS COMILLAS LAS PONE EL SISTEMA, no quien escribe. Dos motivos: salen
   siempre las mismas, y salen siempre las angulares («»), que son las que
   usa el castellano y las que aparecen en los carruseles publicados. Si
   alguien las teclea igualmente, se le quitan antes para no doblarlas.

   Va a tamaño `title` y no `display` porque una cita trae más texto que un
   titular: el peldaño más pequeño deja que entre sin que FitText tenga que
   encogerla hasta deformar la jerarquía. Centrada en la caja, para que no
   quede colgando arriba.

   Funciona igual en el lienzo horizontal: es el layout pensado para él. */

/* Comillas de cualquier clase pegadas a los extremos. Se quitan antes de
   poner las de la casa. */
const COMILLAS = /^[\s"'“”«»‘’]+|[\s"'“”«»‘’]+$/g;

export function Cita({ slide, boxH }: { slide: Extract<Slide, { kind: 'cita' }>; boxH: number }) {
  return (
    <FitText maxHeight={boxH} centerTop={56} className="box l-cita">
      <blockquote className="quote">
        «{inline(slide.text.replace(COMILLAS, ''))}»
        {slide.source && <span className="src">{slide.source}</span>}
      </blockquote>
    </FitText>
  );
}
