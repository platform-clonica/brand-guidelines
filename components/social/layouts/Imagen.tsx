import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';
import { Photo } from '../Photo';

/* Imagen a sangre con texto serif encima, arriba o abajo, o sin texto.
   Sin texto no se pinta velo: una foto limpia no necesita oscurecerse y
   hacerlo solo la ensucia. */
export function Imagen({ slide, boxH }: { slide: Extract<Slide, { kind: 'imagen' }>; boxH: number }) {
  const where = slide.position ?? 'top';
  return (
    <>
      <Photo image={slide.image} scrim={slide.text ? where : 'none'} exposicion={slide.exposicion} />
      {slide.text && (
        <FitText maxHeight={boxH} className={`box l-imagen on-photo at-${where}`}>
          <h2 className="headline sm">{inline(typesetHeadline(slide.text))}</h2>
        </FitText>
      )}
    </>
  );
}
