/* Escala tipográfica del lienzo social — fuente de verdad.
   ─────────────────────────────────────────────────────────────────────────
   Espeja los valores declarados en `components/social/social.css` como
   `--s-*`. Si cambias uno, cambia el otro. Lo consume la galería de layouts
   y la documentación.

   POR QUÉ ESTE ARCHIVO EXISTE Y NO SE REUSA `lib/typeScale.ts`

   La escala de `lib/typeScale.ts` es **web**: cada peldaño es un `clamp()`
   cuyo máximo se alcanza en un viewport grande. Una tarjeta social no es un
   viewport: es un lienzo fijo de 1080 px de ancho que luego se ve a ~400 px
   en el feed de un móvil. Es la misma situación que ya documentó el deck en
   el CLAUDE.md del repo, que por eso declara los peldaños como px y añade
   algún intermedio propio.

   LA REGLA, EN UNA FRASE
   La familia **serif se queda en la escala tal cual**; la familia **mono
   corre a ×2** sobre el lienzo social.

   De dónde sale ese ×2, porque no es un gusto:

   - El serif solo aparece en titulares, y el peldaño `display` de la escala
     (96 px) es exactamente el tamaño al que están puestos los titulares de
     los seis carruseles que Interactius ya tiene publicados. Medido sobre
     los PNG, no estimado. No hace falta tocar nada.
   - El mono aparece en cuerpo de texto, y ahí la escala se queda corta por
     el motivo de arriba: 18 px sobre un lienzo de 1080 se ven a 6,6 px
     cuando la tarjeta se muestra a 400 px de ancho. Ilegible. A ×2 (36 px)
     se ven a 13,3 px, que es la densidad normal de una tarjeta de feed y
     coincide con lo que esos mismos carruseles publicados ya hacen (~34 px).

   Un multiplicador único y explicado es preferible a tres números sueltos:
   si mañana cambia la escala, estos peldaños se recalculan solos.

   PENDIENTE DE ALBERTO
   Esto **extiende** la norma, no la contradice: familias, pesos y la
   prohibición de la cursiva se respetan enteras. Pero un multiplicador de
   lienzo es una decisión de sistema y le toca a él confirmarla o cambiarla.
   Mientras tanto vive aquí declarada, que es lo contrario de esconderla en
   el CSS de una pieza. */

export type SocialFamily = 'mono' | 'serif';

export type SocialScaleEntry = {
  id: string;
  /** La variable CSS que lo declara en `social.css`. */
  cssVar: string;
  /** Tamaño en px del lienzo (ancho base 1080). */
  px: number;
  lineHeight: number;
  letterSpacing?: string;
  family: SocialFamily;
  /** Pesos permitidos. Salen de `typography` en `lib/tokens.ts`, no de aquí. */
  weights: readonly number[];
  /** Peldaño de `lib/typeScale.ts` del que deriva, y cómo. */
  origen: string;
  uso: string;
};

/** Ancho del lienzo para el que está calculada esta escala. */
export const SOCIAL_BASE_WIDTH = 1080;

/** El mono corre a ×2 sobre la escala web. Ver la cabecera de este archivo. */
export const MONO_CANVAS_FACTOR = 2;

export const socialTypeScale: readonly SocialScaleEntry[] = [
  {
    id: 'super',
    cssVar: '--s-super',
    px: 192,
    lineHeight: 1.0,
    family: 'serif',
    weights: [300],
    origen: 'escala `super` (12rem), sin tocar',
    uso: 'Portada de una sola palabra o titular brevísimo. Rara vez cabe otra cosa.',
  },
  {
    id: 'display',
    cssVar: '--s-display',
    px: 96,
    lineHeight: 1.1,
    letterSpacing: '-0.01em',
    family: 'serif',
    weights: [300],
    origen: 'escala `display` (6rem), sin tocar',
    uso: 'Titular principal de una tarjeta. Es el peldaño por defecto de un carrusel.',
  },
  {
    id: 'title',
    cssVar: '--s-title',
    px: 64,
    lineHeight: 1.15,
    family: 'serif',
    weights: [300, 400],
    origen: 'escala `title` (4rem), sin tocar',
    uso: 'Titular secundario, rótulo de sección al pie, cita larga que no cabe en `display`.',
  },
  {
    id: 'title-sm',
    cssVar: '--s-title-sm',
    px: 40,
    lineHeight: 1.3,
    family: 'serif',
    weights: [400],
    origen: 'escala `title-sm` (2rem) ×1,25',
    uso:
      'Entradilla serif y elementos de lista con cuerpo serif. Único peldaño serif que se ' +
      'separa de la escala: a 32 px quedaba por debajo del cuerpo mono (36), que invierte la ' +
      'jerarquía. Es el intermedio propio del lienzo, equivalente al `--title-section` del deck.',
  },
  {
    id: 'body',
    cssVar: '--s-body',
    px: 36,
    lineHeight: 1.55,
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `body` (1,125rem) ×2',
    uso: 'Cuerpo de texto de la tarjeta. El tamaño por defecto de todo lo que se lee seguido.',
  },
  {
    id: 'body-sm',
    cssVar: '--s-body-sm',
    px: 32,
    lineHeight: 1.55,
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `body-sm` (1rem) ×2',
    uso: 'Cuerpo secundario: subtítulo de portada, pie de foto, texto de apoyo.',
  },
  {
    id: 'caption',
    cssVar: '--s-caption',
    px: 20,
    lineHeight: 1.4,
    letterSpacing: '0.04em',
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `caption` (0,625rem) ×2',
    uso: 'Antetítulo, autoría, numeración de lista y el slug de la esquina.',
  },
];

/** El slug de la esquina (`/Miradas/`, `/Eventos/`, `/Summer Fest/`…) va en serif,
    no en mono: es una firma, no una etiqueta de interfaz. Lo usan los seis
    carruseles publicados y es el único elemento serif a tamaño de caption. */
export const SLUG_PX = 28;
