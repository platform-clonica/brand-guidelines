import type { Slide } from '@/lib/deck/types';
import { Chrome } from '../Chrome';

export function Paragraph({ slide, page }: { slide: Extract<Slide, { kind: 'paragraph' }>; page: number }) {
  return (
    <div className={`frame theme-${slide.theme} paragraph`}>
      <Chrome page={page} />
      <div className="wrap">
        {slide.eyebrow && <div className="eyebrow">{slide.eyebrow}</div>}
        <p>{slide.body}</p>
      </div>
    </div>
  );
}
