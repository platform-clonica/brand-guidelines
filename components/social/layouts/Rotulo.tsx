import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';
import { Body } from './Body';

/* Cuerpo mono arriba, rótulo serif grande abajo. El rótulo nombra la
   sección del carrusel («Programa», «Insights», «Feedback») y por eso va
   al pie: se lee después del contexto, no antes. */
export function Rotulo({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'rotulo' }>;
  boxH: number;
}) {
  return (
    <FitText maxHeight={boxH} className="box l-rotulo">
      <Body nodes={slide.body} />
      <h2 className="label">{inline(typesetHeadline(slide.label))}</h2>
    </FitText>
  );
}
