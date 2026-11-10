import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';
import { Photo } from '../Photo';

/* La última tarjeta: la llamada a leer el artículo, la firma y el retrato.

   El retrato muerde la esquina inferior derecha en lugar de flotar centrado.
   Sin foto de quien firma, no se pinta nada: un hueco vacío diría que falta
   algo, y aquí no falta — hay artículos que firma la casa. */
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
      ) : slide.author ? (
        /* Hay firma pero no es nadie del equipo. Firma la casa: el isotipo,
           en negativo porque esta tarjeta siempre va sobre foto. Es lo que
           ya hace la web desde que se unificaron bajo «Interactius» las
           firmas de quienes ya no están. Una inicial suelta no diría nada;
           el isotipo dice lo que de verdad pasa. */
        <div className="avatar marca">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/isotipo-negativo.svg" alt="" />
        </div>
      ) : null}
    </>
  );
}
