import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';

/* Un titular serif y nada más. El layout que más se repite en los
   carruseles publicados. Anclado arriba, como todos. */
export function Titular({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'titular' }>;
  boxH: number;
}) {
  return (
    <FitText maxHeight={boxH} className="box l-titular">
      <h1 className="headline">{inline(typesetHeadline(slide.title))}</h1>
    </FitText>
  );
}
