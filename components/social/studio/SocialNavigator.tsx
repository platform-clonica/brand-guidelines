'use client';

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CanvasId, Slide } from '@/lib/social/types';
import { CANVASES } from '@/lib/social/types';
import { colors } from '@/components/deck/studio/ui';
import { SocialCard } from '../SocialCard';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* La tira de miniaturas, a la izquierda de la vista previa.

   Mismo papel que el `SlideNavigator` del Deck Maker: miniaturas de verdad
   —no capturas ni iconos—, la que se está viendo marcada, y al clicar una
   se va a ella.

   Son miniaturas REALES porque el lienzo ya se escala con una
   transformación: una miniatura es la misma `SocialCard` con otro factor.
   No hay una segunda forma de dibujar una slide, así que no puede derivar.

   Fondo oscuro a propósito. Las slides claras y las oscuras tienen que
   distinguirse del soporte, y sobre beige una slide Warm Light
   desaparecía; es el mismo motivo por el que la vista previa grande va
   sobre blanco con filete. */
export function SocialNavigator({
  slides,
  canvas,
  width,
  seleccionada,
  vistaRef,
  onIr,
}: {
  slides: Slide[];
  canvas: CanvasId;
  width: number;
  /** La que está seleccionada, que es la que editan los paneles. */
  seleccionada: number;
  vistaRef: RefObject<HTMLDivElement | null>;
  onIr: (i: number) => void;
}) {
  /* «Visible» y «seleccionada» son dos cosas distintas a propósito.

     La visible la manda el scroll y solo pinta la marca. La seleccionada la
     manda el clic y es la que editan los paneles. Si el scroll cambiara la
     seleccionada, bajar a mirar la última slide y pulsar un color se lo
     aplicaría a esa, no a la que se estaba editando. */
  const [visible, setVisible] = useState(0);
  const tira = useRef<HTMLDivElement>(null);
  const ratios = useRef<number[]>([]);

  useEffect(() => {
    const raiz = vistaRef.current;
    if (!raiz) return;
    const nodos = Array.from(raiz.querySelectorAll('[data-slide]')) as HTMLElement[];
    if (!nodos.length) return;

    /* Se guarda la visibilidad de TODAS, no solo la de las que cambian: el
       observador avisa de las que entran y salen, y si una vecina saliendo
       fuera la única del aviso ganaría ella y la marca saltaría una de más. */
    ratios.current = new Array(slides.length).fill(0);
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          const i = Number((e.target as HTMLElement).dataset.slide);
          ratios.current[i] = e.isIntersecting ? e.intersectionRatio : 0;
        }
        let mejor = -1;
        let mejorRatio = 0;
        ratios.current.forEach((r, i) => {
          if (r > mejorRatio) {
            mejorRatio = r;
            mejor = i;
          }
        });
        if (mejor >= 0) setVisible(mejor);
      },
      { root: raiz, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    nodos.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [vistaRef, slides.length, canvas]);

  // Que la miniatura marcada no se quede fuera de la tira.
  useEffect(() => {
    tira.current?.querySelector(`[data-mini="${visible}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [visible]);

  const ancho = width - 30;
  const escala = ancho / CANVASES[canvas].w;

  return (
    <div
      ref={tira}
      aria-label="Navegador de slides"
      style={{
        width, flexShrink: 0, background: colors.dark,
        overflowY: 'auto', overflowX: 'hidden',
        /* Filete claro: la tira es oscura y las slides oscuras también, así
           que sin él se funden en el borde. */
        borderRight: '1px solid rgba(245,242,237,.18)',
        padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}
    >
      {slides.map((slide, i) => {
        const marcada = i === visible;
        const elegida = i === seleccionada;
        return (
          <button
            key={i}
            data-mini={i}
            type="button"
            onClick={() => onIr(i)}
            title={`Slide ${i + 1} · ${slide.kind}`}
            aria-current={marcada ? 'true' : undefined}
            style={{
              appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
              padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              width: ancho,
            }}
          >
            <div
              className="ix-social"
              style={{
                width: ancho, lineHeight: 0,
                /* Dos señales distintas: la seleccionada lleva el filete
                   claro, la que se está viendo va a opacidad plena. Así se
                   distingue «la que edito» de «la que estoy mirando». */
                outline: elegida ? `2px solid ${colors.warmLight}` : '2px solid transparent',
                outlineOffset: 2,
                opacity: marcada || elegida ? 1 : 0.7,
                transition: 'opacity .2s',
              }}
            >
              <SocialCard slide={slide} canvas={canvas} scale={escala} />
            </div>
            <span
              style={{
                font: `500 9px/1 ${MONO}`, letterSpacing: '.06em',
                color: marcada || elegida ? colors.warmLight : 'rgba(245,242,237,.5)',
              }}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
