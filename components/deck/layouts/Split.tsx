import type { Slide } from '@/lib/deck/types';
import { Chrome } from '../Chrome';
import { ImageSlot } from '../ImageSlot';
import { inline } from '../inline';
import { Flow } from '../Flow';
import { FitText } from '../FitText';

/* Same band as paragraph/contexto (64 arriba · 64 abajo sobre el lienzo de 720): FitText centra el
   grupo dentro de ella, así el bloque queda a media altura sea cual sea el largo del texto. */
const TXT_TOP = 64;
const TXT_MAX_H = 592;

export function Split({ slide, page }: { slide: Extract<Slide, { kind: 'split' }>; page: number }) {
  return (
    <div className={`frame theme-${slide.theme} split${slide.imageSide === 'left' ? ' img-left' : ''}`}>
      <Chrome page={page} />
      <ImageSlot image={slide.image} className="photo" slideIndex={page - 1} />
      <FitText className="txt" maxHeight={TXT_MAX_H} centerTop={TXT_TOP}>
        {slide.eyebrow && <div className="eyebrow">{inline(slide.eyebrow)}</div>}
        <h2>{inline(slide.title)}</h2>
        {slide.body && slide.body.length > 0 && (
          <div className="body"><Flow nodes={slide.body} /></div>
        )}
      </FitText>
    </div>
  );
}
