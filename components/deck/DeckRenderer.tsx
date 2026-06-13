'use client';
import { useEffect, useRef } from 'react';
import './deck.css';
import type { Deck, Slide } from '@/lib/deck/types';
import { Cover, Statement, Bullets, Columns, Split, Gantt, Closing, Paragraph, Manifesto, Team, Clients } from './layouts';

function renderSlide(slide: Slide, page: number) {
  switch (slide.kind) {
    case 'cover': return <Cover slide={slide} />;
    case 'statement': return <Statement slide={slide} page={page} />;
    case 'bullets': return <Bullets slide={slide} page={page} />;
    case 'columns': return <Columns slide={slide} page={page} />;
    case 'split': return <Split slide={slide} page={page} />;
    case 'gantt': return <Gantt slide={slide} page={page} />;
    case 'closing': return <Closing slide={slide} />;
    case 'paragraph': return <Paragraph slide={slide} page={page} />;
    case 'manifesto': return <Manifesto page={page} />;
    case 'team': return <Team page={page} />;
    case 'clients': return <Clients page={page} />;
  }
}

export function DeckRenderer({ deck }: { deck: Deck }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const s = Math.min(el.clientWidth / 1280, el.clientHeight / 720);
      el.style.setProperty('--s', String(s || 1));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, [deck]);

  return (
    <div className="ix-deck" ref={ref}>
      {deck.slides.map((slide, i) => (
        <section className="slide" key={i}>
          <div className="fwrap">{renderSlide(slide, i + 1)}</div>
        </section>
      ))}
    </div>
  );
}
