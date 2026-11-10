import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { inline } from '@/components/deck/inline';

/* Una cita a toda la tarjeta. Va a tamaño `title` y no `display` porque una
   cita trae más texto que un titular: el peldaño más pequeño deja que entre
   sin que FitText tenga que encogerla hasta deformar la jerarquía.
   Centrada en la caja, para que no quede colgando arriba. */
export function Cita({ slide, boxH }: { slide: Extract<Slide, { kind: 'cita' }>; boxH: number }) {
  return (
    <FitText maxHeight={boxH} centerTop={56} className="box l-cita">
      <blockquote className="quote">
        {inline(slide.text)}
        {slide.source && <span className="src">{slide.source}</span>}
      </blockquote>
    </FitText>
  );
}
