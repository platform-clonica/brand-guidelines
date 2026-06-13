import type { Slide } from '@/lib/deck/types';
import { Chrome } from '../Chrome';

export function Columns({ slide, page }: { slide: Extract<Slide, { kind: 'columns' }>; page: number }) {
  return (
    <div className={`frame theme-${slide.theme} cols`}>
      <Chrome page={page} />
      <div className="title">{slide.title}</div>
      <div className="grid">
        {slide.columns.map((col, i) => (
          <div className="col" key={i}>
            <div className="num">{col.label}</div>
            <div className="colhd">{col.heading}</div>
            <div className="colbody">{col.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
