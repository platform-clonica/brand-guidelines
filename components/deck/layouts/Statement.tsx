import type { Slide } from '@/lib/deck/types';
import { Chrome } from '../Chrome';

export function Statement({ slide, page }: { slide: Extract<Slide, { kind: 'statement' }>; page: number }) {
  return (
    <div className={`frame theme-${slide.theme} statement`}>
      <Chrome page={page} />
      <div className="wrap">
        {slide.eyebrow && <div className="eyebrow">{slide.eyebrow}</div>}
        <h2>{slide.title}</h2>
      </div>
    </div>
  );
}
