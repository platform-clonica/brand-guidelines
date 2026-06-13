import type { Slide } from '@/lib/deck/types';
import { Chrome } from '../Chrome';
import { ImageSlot } from '../ImageSlot';

export function Split({ slide, page }: { slide: Extract<Slide, { kind: 'split' }>; page: number }) {
  return (
    <div className={`frame theme-${slide.theme} split`}>
      <ImageSlot image={slide.image} className="photo" />
      <div className="tab">
        <span className="lbl yr">2026</span>
        <span className="lbl nm">Interactius</span>
      </div>
      <div className="txt">
        {slide.eyebrow && <div className="eyebrow">{slide.eyebrow}</div>}
        <h2>{slide.title}</h2>
        {slide.body && <div className="body">{slide.body}</div>}
      </div>
      <div className="pageno" style={{ left: 'auto', right: 'var(--mr)', color: 'var(--ash)' }}>
        {String(page).padStart(2, '0')}
      </div>
    </div>
  );
}
