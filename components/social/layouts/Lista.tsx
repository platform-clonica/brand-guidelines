import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { typesetHeadline } from '@/lib/deck/typeset';
import { inline } from '@/components/deck/inline';

/* Titular, entradilla opcional y elementos numerados con filete.
   La numeración va en mono pequeño y el texto en serif: el número es una
   etiqueta, el contenido es la voz. */
export function Lista({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'lista' }>;
  boxH: number;
}) {
  return (
    <FitText maxHeight={boxH} className="box l-lista">
      {slide.title && <h2 className="headline">{inline(typesetHeadline(slide.title))}</h2>}
      {slide.intro && <p className="copy intro">{inline(slide.intro)}</p>}
      <ul className="items">
        {slide.items.map((it, i) => (
          <li key={i}>
            <span className="n">{i + 1}</span>
            <span className="t">
              {it.lead && <span className="lead">{inline(it.lead)} </span>}
              {inline(it.text)}
            </span>
          </li>
        ))}
      </ul>
    </FitText>
  );
}
