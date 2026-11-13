import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { Body } from './Body';

/* Un cuerpo de texto en SERIF, sin titular.

   Es el mismo papel que la diapositiva `paragraph` del deck, que también
   pone el cuerpo largo en la tipografía de contraste. Un párrafo así no
   informa: razona. Por eso no lleva titular que lo resuma; el texto es la
   pieza entera.

   Aparece dos veces en las seis tarjetas del carrusel de Insights, que es
   lo que justifica que sea un layout y no un apaño: un layout que se usa
   una sola vez es un layout que el siguiente usará mal. */
export function Parrafo({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'parrafo' }>;
  boxH: number;
}) {
  return (
    <FitText maxHeight={boxH} className="box l-parrafo">
      <Body nodes={slide.body} className="prosa" />
    </FitText>
  );
}
