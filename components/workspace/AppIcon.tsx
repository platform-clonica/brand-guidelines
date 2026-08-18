/* Iconos de las herramientas del dispatcher.

   Mapa por `id` del catálogo, no un campo de lib/workspace/catalog.ts: ese módulo es tabla de
   datos pura —lo importan los tests— y meterle JSX lo convertiría en otra cosa. Una herramienta
   sin icono aquí simplemente no lo pinta; la tarjeta sigue funcionando con su wordmark.

   Van inline, no como <img src>: la home es un server component sin JavaScript de cliente, así
   que el SVG viaja ya en el HTML y no cuesta una petición más. Son decorativos —el wordmark de la
   tarjeta ya nombra la herramienta— de ahí el aria-hidden.

   COLORES. Tres capas, y cada una responde a una regla distinta:

   · Estructura principal → Dark #1C1A17 y estructura secundaria → Opal #B0B5B0. Son los de marca.
     Los originales de diseño traían las versiones frías (#1E2024 y #ABAFB8): a 72 px no se
     distinguen, así que se alinearon al sistema en agosto de 2026.
   · Acento → uno por herramienta, declarado en `toolIconAccents` de lib/tokens.ts. NO son colores
     de marca y no deben salir de estos iconos. Si añades una herramienta, su acento se declara
     ALLÍ antes que aquí. */

import { cloneElement, type ReactElement } from 'react';

const ICONS: Record<string, ReactElement> = {
  rewritr: (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false" className="ixw-tile__icon">
      {/* Estructura secundaria: solapa trasera del sobre y texto original */}
      <g stroke="#B0B5B0" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M40 200 L200 40 L360 200" />
        <path d="M120 120 H180 M120 160 H170" />
      </g>

      {/* Estructura principal: documento emergiendo y cuerpo del sobre */}
      <g stroke="#1C1A17" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M80 200 V80 H320 V200" />
        <path d="M40 200 H360 V360 H40 Z" />
        <path d="M40 200 L200 360 L360 200" />
      </g>

      {/* Acento: transformación, texto optimizado y nodos de IA */}
      <g stroke="#00D1FF" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M190 140 H210 M200 130 L210 140 L200 150" />
        <path d="M230 120 H280 M230 160 H290" />
        <path d="M320 60 L340 80 L320 100 L300 80 Z" fill="#00D1FF" fillOpacity="0.15" />
        <path d="M355 45 L365 55 L355 65 L345 55 Z" fill="#00D1FF" fillOpacity="0.15" />
      </g>
    </svg>
  ),

  deckmakr: (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false" className="ixw-tile__icon">
      {/* Estructura secundaria: diapositiva en cola y guías de maquetación */}
      <g stroke="#B0B5B0" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M70 50 H270 V190 H70 Z" />
        <path d="M95 85 H165 M95 115 H200 M95 145 H150" />
      </g>

      {/* Estructura principal: caballete y diapositiva activa */}
      <g stroke="#1C1A17" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M50 250 H350" />
        <path d="M140 250 L80 360 M260 250 L320 360 M200 250 V360" />
        <path d="M130 90 H330 V230 H130 Z" />
        <path d="M155 120 H225" />
      </g>

      {/* Acento: gráfico de crecimiento y nodo de generación */}
      <g stroke="#FF6B6B" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M250 190 V160 M275 190 V140 M300 190 V120" />
        <path d="M240 170 L280 130 L305 105 M285 105 H305 V125" />
        <path d="M340 50 L355 65 L340 80 L325 65 Z" fill="#FF6B6B" fillOpacity="0.15" />
      </g>
    </svg>
  ),

  formmakr: (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false" className="ixw-tile__icon">
      {/* Estructura secundaria: títulos y textos de marcador */}
      <g stroke="#B0B5B0" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M80 70 H180 M200 70 H220" />
        <path d="M100 155 H240" />
        <path d="M100 235 H160" />
      </g>

      {/* Estructura principal: contenedor y cajas de entrada */}
      <g stroke="#1C1A17" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M40 40 H360 V360 H40 Z" />
        <path d="M40 100 H360" />
        <path d="M80 130 H320 V180 H80 Z" />
        <path d="M80 210 H240 V260 H80 Z" />
        <path d="M200 230 L210 240 L220 230" />
        <path d="M270 210 H320 V260 H270 Z" />
      </g>

      {/* Acento: validación y botón de envío */}
      <g stroke="#10B981" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M245 235 L285 275 L350 210" />
        <path d="M80 290 H320 V340 H80 Z" fill="#10B981" fillOpacity="0.15" />
        <path d="M170 315 H230 M220 305 L230 315 L220 325" />
      </g>
    </svg>
  ),

  dsmakr: (
    <svg viewBox="0 0 400 400" fill="none" aria-hidden="true" focusable="false" className="ixw-tile__icon">
      {/* Estructura secundaria: ejes de retícula, jerarquía y enlace de sistema */}
      <g stroke="#B0B5B0" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M40 80 H360 M120 40 V360" />
        <path d="M75 180 H185 M75 220 H140 M75 260 H170" />
        <path d="M220 180 L280 120" />
      </g>

      {/* Estructura principal: marco de componente y lienzo secundario */}
      <g stroke="#1C1A17" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M40 120 H220 V360 H40 Z" />
        <path d="M75 295 H185 V335 H75 Z" />
        <path d="M220 220 H360 V360 H220" />
      </g>

      {/* Acento: tokens de diseño, componente maestro y propagación */}
      <g stroke="#00D1FF" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M310 40 L360 90 L310 140 L260 90 Z" fill="#00D1FF" fillOpacity="0.15" />
        <path d="M310 80 V100 M300 90 H320" />
        <path d="M260 220 H360 V320 H260 Z" fill="#00D1FF" fillOpacity="0.15" />
        <path d="M310 250 L330 270 L310 290 L290 270 Z" />
        <path d="M220 270 H260 M235 255 L220 270 L235 285" />
      </g>
    </svg>
  ),
};

/* `size` reduce el icono para la cabecera sin tocar los SVG ni duplicarlos: sustituye la clase
   de 72 px de la tarjeta por medidas en línea. Sin `size`, se comporta como siempre. */
export function AppIcon({ id, size }: { id: string; size?: number }) {
  const icon = ICONS[id];
  if (!icon) return null;
  if (size === undefined) return icon;
  return cloneElement(icon, {
    className: undefined,
    style: { width: size, height: size, flexShrink: 0 },
  } as Partial<ReactElement['props']>);
}
