import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';
import { Photo } from '../Photo';

/* Portada: foto a sangre, titular serif y subtítulo mono.

   El titular va al extremo CONTRARIO de donde esté la papelería, y el velo
   lo sigue. Un velo en el lado equivocado deja el titular sobre la parte
   clara de la foto, y eso no se descubre hasta que la pieza está
   publicada. */
export function Portada({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'portada' }>;
  boxH: number;
}) {
  const enCabecera = slide.papeleria === 'cabecera';
  return (
    <>
      <Photo image={slide.image} scrim={enCabecera ? 'bottom' : 'top'} exposicion={slide.exposicion} />
      <FitText maxHeight={boxH} className="box l-portada on-photo">
        <div>
          <h1 className="headline l">{inline(typesetHeadline(slide.title))}</h1>
          {slide.subtitle && <p className="copy sub">{inline(slide.subtitle)}</p>}
        </div>
      </FitText>
    </>
  );
}
