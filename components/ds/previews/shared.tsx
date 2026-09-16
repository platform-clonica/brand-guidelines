import type { CSSProperties, ReactElement } from 'react';
import type { ComponentProps } from '@/lib/ds/components';
import { rgba } from '@/lib/ds/engine/color';
import type { ResolvedTokens } from '@/lib/ds/engine/resolve';
import type { ComponentConfig } from '@/lib/ds/schema';

/* Piezas comunes de los renders de componentes (components/ds/previews).

   Un render es una función PURA (tokens resueltos + configuración → elemento): sin hooks, sin estado
   y sin manejadores. Así el mismo render sirve para el paso 3 y, en 5d, para el styleguide con
   `renderToStaticMarkup`. Todo lo que pinta es del CLIENTE (fuentes, pesos, colores): las normas de
   marca de lib/tokens.ts no aplican aquí. El texto de muestra sí va en castellano y sin puntos
   suspensivos, porque acaba en el styleguide. */

/** Configuración con las props ya resueltas (tokens + talla + lo editado a mano). */
export type RenderConfig = Omit<ComponentConfig, 'props'> & { props: ComponentProps };
export type Render = (t: ResolvedTokens, c: RenderConfig) => ReactElement;

type Scale = Record<string, string>;

export const px = (v: number) => `${Math.round(v)}px`;
export const num = (c: RenderConfig, key: string) => Number(c.props[key]) || 0;

export const radius = (t: ResolvedTokens, name: unknown) => t.rad[String(name)] ?? '4px';
export const shadow = (t: ResolvedTokens, name: unknown, fallback = 'none') => t.sh[String(name)] ?? fallback;

/** Escalón según el modo: el primero en claro, el segundo en oscuro. */
export const tone = (t: ResolvedTokens, scale: Scale, light: string, dark: string) => scale[t.dark ? dark : light];

/** Fondo de hover y de campo desactivado. */
export const subtle = (t: ResolvedTokens) => (t.dark ? t.N['800'] : t.N['50']);

/** Halo del primario: anillo de foco (3 px) o de arrastre (6 px). */
export const focusRing = (t: ResolvedTokens, alpha: number, spread = 3) => `0 0 0 ${spread}px ${rgba(t.P['500'], alpha)}`;

/* Los cuatro lados por separado. Mezclar `border` con `borderLeft` y cambiar de variante hace que React
   quite una propiedad larga sobre una corta (el aviso que ya se documenta en components/deck/studio/ui.ts). */
export const sides = (border: string): CSSProperties => ({ borderTop: border, borderRight: border, borderBottom: border, borderLeft: border });

export function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

export function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <path d="M12 3a9 9 0 1 1-6.4 2.6" />
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
    </svg>
  );
}

/* Hueco de páginas. El prototipo usaba el carácter de puntos suspensivos, que la norma de puntuación
   evita; un icono de tres puntos dice lo mismo sin ser texto. */
export function DotsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
