import type { Slide } from '@/lib/deck/types';
import { Chrome } from '../Chrome';
import { ImageSlot } from '../ImageSlot';
import { inline } from '../inline';

/* Ref slide 22: "Objetivos" title + numbered list (left) + image (right). */
export function Objetivos({ slide, page }: { slide: Extract<Slide, { kind: 'objetivos' }>; page: number }) {
  return (
    <div className={`frame theme-${slide.theme} objetivos`}>
      <Chrome page={page} />
      <div className="title">{slide.title}</div>
      <ol className="list">
        {slide.items.map((it, i) => (
          <li key={i}>
            <span className="n">{i + 1}</span>
            <span className="body">{inline(it)}</span>
          </li>
        ))}
      </ol>
      <ImageSlot image={slide.image} className="photo" slideIndex={page - 1} />
    </div>
  );
}
