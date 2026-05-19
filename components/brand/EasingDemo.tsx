'use client';

import { useRef, useState } from 'react';

type Props = {
  /* Easing literal as accepted by Web Animations API (e.g. cubic-bezier(...) or a named easing). */
  cssCubic: string;
  /* Duration in ms for the demo run. */
  durationMs: number;
  /* Optional aria-label for the play button. */
  label?: string;
};

const BALL_PX = 10;

/* Visual playback of an easing curve. A small ball slides across a track using
   the exact CSS easing function and duration declared in the system. */
export function EasingDemo({ cssCubic, durationMs, label = 'Play' }: Props) {
  const ballRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const el = ballRef.current;
    if (!el || playing) return;
    setPlaying(true);
    el.style.left = '0px';
    // Force reflow so the next animation starts cleanly.
    void el.offsetWidth;
    const anim = el.animate(
      [{ left: '0px' }, { left: `calc(100% - ${BALL_PX}px)` }],
      { duration: durationMs, easing: cssCubic, fill: 'forwards' },
    );
    anim.onfinish = () => {
      setPlaying(false);
    };
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={play}
        aria-label={label}
        disabled={playing}
        className="font-mono text-caption uppercase tracking-[0.08em] text-dark/55 hover:text-dark transition-colors duration-300 ease-expo w-fit inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-default"
      >
        <span aria-hidden>▶</span>
        <span>{label}</span>
      </button>
      <div className="relative h-2 bg-dark/8 overflow-hidden" aria-hidden>
        <div
          ref={ballRef}
          className="absolute top-1/2 -translate-y-1/2 h-2 bg-dark"
          style={{ left: 0, width: `${BALL_PX}px` }}
        />
      </div>
    </div>
  );
}
