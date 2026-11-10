import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';
import { Photo } from '../Photo';

/* Portada: foto a sangre, titular serif abajo y subtítulo mono.
   El titular va abajo y no arriba porque la foto se lee primero y el texto
   tiene que cerrarla, no taparla. */
export function Portada({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'portada' }>;
  boxH: number;
}) {
  return (
    <>
      <Photo image={slide.image} scrim="bottom" />
      <FitText maxHeight={boxH} className="box l-portada on-photo">
        <div>
          <h1 className="headline">{inline(typesetHeadline(slide.title))}</h1>
          {slide.subtitle && <p className="copy sm sub">{inline(slide.subtitle)}</p>}
        </div>
      </FitText>
    </>
  );
}
