import type { Slide } from '@/lib/social/types';
import { FitText } from '@/components/deck/FitText';
import { inline } from '@/components/deck/inline';

/* Qué y a qué hora. Las horas van en cifras tabulares para que la columna
   derecha quede alineada sea cual sea la hora. */
export function Agenda({
  slide,
  boxH,
}: {
  slide: Extract<Slide, { kind: 'agenda' }>;
  boxH: number;
}) {
  return (
    <FitText maxHeight={boxH} className="box l-agenda">
      {slide.title && <h2 className="headline sm">{inline(slide.title)}</h2>}
      <ul className="agenda">
        {slide.rows.map((r, i) => (
          <li key={i}>
            <span className="what">{inline(r.label)}</span>
            {r.time && <span className="when">{r.time}</span>}
          </li>
        ))}
      </ul>
    </FitText>
  );
}
