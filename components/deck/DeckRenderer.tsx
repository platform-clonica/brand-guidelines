'use client';
import { useEffect, useRef } from 'react';
import './deck.css';
import type { Deck, Slide } from '@/lib/deck/types';
import { ImageEditContext, ViewerContext } from './viewer';
import { Cover, Statement, Bullets, Columns, Split, Gantt, Closing, Paragraph, Manifesto, Team, Clients, Budget, Acceptance, Contexto, ElReto, Objetivos, RoadmapPhases } from './layouts';

export function renderSlide(slide: Slide, page: number) {
  switch (slide.kind) {
    case 'cover': return <Cover slide={slide} page={page} />;
    case 'statement': return <Statement slide={slide} page={page} />;
    case 'bullets': return <Bullets slide={slide} page={page} />;
    case 'columns': return <Columns slide={slide} page={page} />;
    case 'split': return <Split slide={slide} page={page} />;
    case 'gantt': return <Gantt slide={slide} page={page} />;
    case 'closing': return <Closing slide={slide} />;
    case 'paragraph': return <Paragraph slide={slide} page={page} />;
    case 'manifesto': return <Manifesto slide={slide} page={page} />;
    case 'team': return <Team slide={slide} page={page} />;
    case 'clients': return <Clients slide={slide} page={page} />;
    case 'budget': return <Budget page={page} items={slide.items} total={slide.total} conditions={slide.conditions} />;
    case 'acceptance': return <Acceptance slide={slide} page={page} />;
    case 'contexto': return <Contexto slide={slide} page={page} />;
    case 'elreto': return <ElReto slide={slide} page={page} />;
    case 'objetivos': return <Objetivos slide={slide} page={page} />;
    case 'roadmapPhases': return <RoadmapPhases slide={slide} page={page} />;
  }
}

export function DeckRenderer({
  deck,
  viewer = false,
  onPickImage,
}: {
  deck: Deck;
  viewer?: boolean;
  onPickImage?: (slideIndex: number) => void;
}) {
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
    <ViewerContext.Provider value={viewer}>
      <ImageEditContext.Provider value={viewer ? null : onPickImage ?? null}>
        <div className="ix-deck" ref={ref}>
          {deck.slides.map((slide, i) => (
            <section className="slide" key={i} id={`ix-slide-${i}`} data-ix-slide={i}>
              <div className="fwrap">{renderSlide(slide, i + 1)}</div>
            </section>
          ))}
        </div>
      </ImageEditContext.Provider>
    </ViewerContext.Provider>
  );
}
