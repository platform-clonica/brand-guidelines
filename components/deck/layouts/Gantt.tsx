import { Fragment } from 'react';
import type { Slide } from '@/lib/deck/types';
import { Chrome } from '../Chrome';

export function Gantt({ slide, page }: { slide: Extract<Slide, { kind: 'gantt' }>; page: number }) {
  const weeks = Array.from({ length: slide.weeks }, (_, i) => i + 1);
  const cols = `130px repeat(${slide.weeks}, 1fr)`;
  return (
    <div className={`frame theme-${slide.theme} gantt`}>
      <Chrome page={page} />
      <div className="title">{slide.title}</div>
      {slide.subtitle && <div className="sub">{slide.subtitle}</div>}
      <div className="chart" style={{ gridTemplateColumns: cols }}>
        <div className="ghd lbl">Semanas</div>
        {weeks.map((n) => (
          <div className="ghd" key={`h${n}`}>{n}</div>
        ))}
        <div className="sep" />
        {slide.rows.map((row, ri) => (
          <Fragment key={`r${ri}`}>
            <div className="rlabel">{row.label}</div>
            {weeks.map((n) => (
              <div className="cell" key={`c${ri}-${n}`}>
                {n === row.start && (
                  <div
                    className="bar"
                    style={{
                      background: `var(--${row.accent})`,
                      left: 6,
                      width: `calc(${row.end - row.start + 1} * 100% - 12px)`,
                    }}
                  />
                )}
              </div>
            ))}
            <div className="sep" />
          </Fragment>
        ))}
        <div className="rlabel" style={{ background: 'transparent', fontWeight: 600, color: 'var(--dark)' }}>
          Cliente
        </div>
        {weeks.map((n) => (
          <div className="mil" key={`m${n}`}>{slide.milestones.includes(n) ? '◆' : ''}</div>
        ))}
      </div>
      {slide.note && <div className="note">{slide.note}</div>}
    </div>
  );
}
