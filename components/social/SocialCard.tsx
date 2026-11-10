'use client';

import './social.css';
import type { CanvasId, Slide } from '@/lib/social/types';
import { CANVASES } from '@/lib/social/types';
import { boxHeight } from '@/lib/social/geometry';
import { Foot, Head, type Mark } from './Foot';
import { Photo } from './Photo';
import {
  Agenda,
  Cierre,
  Cita,
  Foto,
  Lista,
  Portada,
  Rotulo,
  Texto,
  Titular,
} from './layouts';

/* Una tarjeta. Elige el layout, pinta el marco y pone el pie.

   El marco es de tamaño fijo y se escala con una transformación, igual que
   el deck: así la vista previa, la miniatura y el PNG exportado salen del
   MISMO árbol de nodos. Es lo que evita tener una segunda versión del
   diseño — el problema que ya tiene la imagen de previsualización de los
   decks y que el CLAUDE.md del repo señala como fuente de deriva. */

const LAYOUTS_SOBRE_FOTO: Slide['kind'][] = ['portada', 'foto', 'cierre'];

export function SocialCard({
  slide,
  canvas,
  scale = 1,
}: {
  slide: Slide;
  canvas: CanvasId;
  /** Factor de visualización. La exportación siempre va a 1 y multiplica aparte. */
  scale?: number;
}) {
  const spec = CANVASES[canvas];
  const boxH = boxHeight(canvas);
  /* Sobre foto se está de dos maneras: porque el layout la lleva de serie,
     o porque alguien le ha puesto una de fondo a una tarjeta plana. Las
     dos piden tinta clara y papelería en negativo. */
  const conFondo = Boolean(slide.fondo?.src);
  const onPhoto = LAYOUTS_SOBRE_FOTO.includes(slide.kind) || conFondo;
  /* La portada puede llevar la papelería en cabecera en vez de al pie. Es
     lo que distingue la serie de Miradas de las de evento y workshop, y lo
     que da variedad en el feed sin inventar un diseño nuevo. */
  const enCabecera = slide.kind === 'portada' && slide.papeleria === 'cabecera';
  /* Un logo de cliente manda sobre todo; si no, el imagotipo solo en portada. */
  const mark: Mark = slide.logo?.src ? 'logo' : slide.kind === 'portada' ? 'imagotipo' : 'ninguna';
  /* El relleno solo manda cuando no hay foto debajo. */
  const bgClass = !onPhoto && slide.bg ? ` bg-${slide.bg}` : '';

  return (
    <div
      className="card"
      style={
        {
          '--cw': `${spec.w}px`,
          '--ch': `${spec.h}px`,
          '--s': scale,
        } as React.CSSProperties
      }
    >
      <div
        className={`frame theme-${slide.theme}${bgClass} l-${slide.kind}${enCabecera ? ' con-cabecera' : ''}${conFondo ? ' on-photo' : ''}`}
      >
        {/* La foto de fondo va la PRIMERA, debajo de todo lo demás. */}
        {conFondo && <Photo image={slide.fondo} scrim="full" />}
        {slide.kind === 'portada' && <Portada slide={slide} boxH={boxH} />}
        {slide.kind === 'titular' && <Titular slide={slide} boxH={boxH} />}
        {slide.kind === 'texto' && <Texto slide={slide} boxH={boxH} />}
        {slide.kind === 'lista' && <Lista slide={slide} boxH={boxH} />}
        {slide.kind === 'cita' && <Cita slide={slide} boxH={boxH} />}
        {slide.kind === 'foto' && <Foto slide={slide} boxH={boxH} />}
        {slide.kind === 'rotulo' && <Rotulo slide={slide} boxH={boxH} />}
        {slide.kind === 'agenda' && <Agenda slide={slide} boxH={boxH} />}
        {slide.kind === 'cierre' && <Cierre slide={slide} boxH={boxH} />}
        {/* El cierre no lleva papelería: su esquina derecha la ocupa el
            retrato y su izquierda, la firma. Pintar además el slug los
            solaparía. */}
        {slide.kind === 'cierre' ? null : enCabecera ? (
          <Head slug={slide.slug} logo={slide.logo} negative />
        ) : (
          <Foot
            slug={slide.slug}
            logo={slide.logo}
            mark={mark}
            negative={slide.theme === 'dark' || onPhoto}
            onPhoto={onPhoto}
          />
        )}
      </div>
    </div>
  );
}
