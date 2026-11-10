import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';
import { Body } from './Body';

/* Titular serif opcional + cuerpo en mono. El caballo de batalla: sin
   titular es el bloque de texto suelto, con titular es la tarjeta normal.
   Un solo layout para los dos porque es un solo rol. */
export function Texto({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'texto' }>;
  boxH: number;
}) {
  return (
    <FitText maxHeight={boxH} className="box l-texto">
      {slide.eyebrow && <span className="eyebrow">{slide.eyebrow}</span>}
      {slide.title && <h2 className="headline">{inline(typesetHeadline(slide.title))}</h2>}
      <Body nodes={slide.body} />
    </FitText>
  );
}
