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

   LOS NOMBRES SON EL PAPEL, NO EL TAMAÑO
   Una slide no elige un tamaño: elige qué es. XL para el cierre, L para la
   portada, M para cualquier titular interior, S para los elementos de
   lista, y UN SOLO tamaño de mono para todo lo que se lee seguido.

   Antes había siete peldaños repartidos por capricho de cada layout y se
   notaba al pasar de una slide a otra. Unificado el 12/11/2026 por
   decisión de Martina.

   LA REGLA DE LOS VALORES
   Los valores salieron de medir los carruseles publicados y el equipo los
   subió después, el 12/11/2026: en un lienzo de 1080 hay sitio de sobra y
   las piezas no van densas. La escala entera sube un escalón sin tocar las
   proporciones entre peldaños. El medido de cada uno queda anotado en su
   `origen` para que se pueda volver.

   De dónde sale, porque no es un gusto. Se midió el ancho de tinta de
   cadenas concretas sobre los PNG publicados y se buscó qué tamaño las
   reproduce con la fuente real en el navegador:

       «La abundancia de»                 titular     →  96 px
       «No definir el problema real»      lista       →  57 px
       «Por Martina Gentile»              firma       →  49 px
       «/Miradas/»                        slug        →  49 px
       «En un entorno saturado de…»       cuerpo mono →  40 px

   El titular cae exactamente en el peldaño `display` de la escala, así que
   ahí no hay nada que tocar. El resto pide subir, y 2,25 es el factor que
   lleva el cuerpo mono de 18 a 40,5. Redondeado da 40 / 36 / 22.

   La primera versión de este archivo usaba ×2 y se quedaba corta: el
   imagotipo salía a 26 px cuando mide 41 en los diseños, y el pie entero
   iba descompensado. El error fue estimar en lugar de medir.

   Y la segunda dejó el slug a 40 por una medición mala: la ventana con la
   que se recortó el PNG cortaba la barra inicial, así que salían 174 px de
   ancho cuando son 217. Con la ventana entera da 49. Moraleja barata: al
   medir sobre un recorte, comprobar antes que el recorte contiene la pieza
   entera. Se verificó en tres tarjetas distintas, que dan 217 × 45 las
   tres, al píxel.

   Un multiplicador único y explicado es preferible a números sueltos: si
   mañana cambia la escala, estos peldaños se recalculan solos.

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

/** Factor del lienzo sobre la escala web. Ver la cabecera de este archivo. */
export const CANVAS_FACTOR = 2.25;

export const socialTypeScale: readonly SocialScaleEntry[] = [
  {
    id: 'xl',
    cssVar: '--s-xl',
    px: 192,
    lineHeight: 1.0,
    family: 'serif',
    weights: [300],
    origen: 'escala `super` (12rem), sin tocar',
    uso: 'El titular del cierre. Es el único texto de su slide, así que puede y debe ocupar.',
  },
  {
    id: 'l',
    cssVar: '--s-l',
    px: 120,
    lineHeight: 1.1,
    letterSpacing: '-0.01em',
    family: 'serif',
    weights: [300],
    origen: 'escala `display` (6rem) ×1,25',
    uso: 'El titular de la portada, y solo ese. Medido 96 en los carruseles publicados.',
  },
  {
    id: 'm',
    cssVar: '--s-m',
    px: 80,
    lineHeight: 1.15,
    family: 'serif',
    weights: [300, 400],
    origen: 'escala `title` (4rem) ×1,25',
    uso: 'CUALQUIER titular interior, la cita y el párrafo serif. Un solo tamaño para todos.',
  },
  {
    id: 's',
    cssVar: '--s-s',
    px: 60,
    lineHeight: 1.3,
    family: 'serif',
    weights: [300, 400],
    origen: 'escala `title-sm` (2rem) ×1,875',
    uso: 'Los elementos de una lista. Por debajo del titular que los encabeza, que va a M.',
  },
  {
    id: 'pie',
    cssVar: '--s-pie',
    px: 56,
    lineHeight: 1.0,
    family: 'serif',
    weights: [300, 400],
    origen: 'intermedio propio del lienzo',
    uso:
      'El slug de la esquina y la firma del cierre. No es contenido, es papelería, y por eso ' +
      'tiene su propio peldaño en vez de compartirlo con los titulares.',
  },
  {
    id: 'mono',
    cssVar: '--s-mono',
    px: 46,
    lineHeight: 1.55,
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `body` (1,125rem) ×2,55 — medido 40, subido a 46',
    uso:
      'TODO el texto en mono, sin excepción: cuerpo, subtítulo de portada y texto de apoyo. ' +
      'Un solo tamaño, decisión de Martina: los saltos de 40 a 36 se notaban al pasar de una ' +
      'slide a otra y no decían nada.',
  },
  {
    id: 'micro',
    cssVar: '--s-micro',
    px: 24,
    lineHeight: 1.4,
    letterSpacing: '0.04em',
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `caption` (0,625rem) ×2,4',
    uso:
      'Antetítulo y numeración de lista. Es mono también, pero no es texto corrido: es una ' +
      'etiqueta, y por eso no entra en la regla del tamaño único.',
  },
];

/* El imagotipo tiene UNA medida y es siempre la misma, en los nueve
   layouts: 48 px de alto, que con la proporción del SVG (3131×404) dan 372
   de ancho. Un logo que cambia de tamaño según la tarjeta deja de ser un
   logo.

   Los diseños de referencia lo tienen a 41 (317×41, idéntico en los dos
   carruseles de Miradas, al píxel). Sube a 48 con el peldaño `title-sm`,
   para conservar la proporción de 0,85 que guarda con el slug: si uno
   crece y el otro no, el pie se descuadra. */
export const WORDMARK_H = 48;

/* El retrato de la tarjeta de cierre: cuadrado, y al mismo margen de página
   que todo lo demás. Medido 331×331 en una pieza publicada y 328 de ancho
   en la otra. */
export const AVATAR_PX = 330;
