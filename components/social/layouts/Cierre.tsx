import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';
import { Photo } from '../Photo';

/* La última tarjeta: la llamada a leer el artículo, la firma y el retrato.

   El retrato es un cuadrado al mismo margen de página que todo lo demás,
   no pegado al borde.

   Sin retrato no se pinta nada. Se probó a poner el isotipo en su lugar,
   como hace la web cuando una pieza la firma la casa, y a este tamaño era
   un error: allí es un avatar pequeño en una lista y aquí sería un bloque
   de 330 px dominando la tarjeta. Una firma sin cara se sostiene sola; el
   editor ya avisa de que ese nombre no está en el equipo. */
export function Cierre({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'cierre' }>;
  boxH: number;
}) {
  return (
    <>
      <Photo image={slide.image} scrim="bottom" />
      <FitText maxHeight={boxH} className="box l-cierre on-photo">
        <h2 className="headline">{inline(typesetHeadline(slide.title))}</h2>
      </FitText>
      {slide.author && <span className="by">Por {slide.author}</span>}
      {slide.avatar?.src ? (
        <div className="avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slide.avatar.src} alt={slide.author ?? ''} />
        </div>
      ) : null}
    </>
  );
}
