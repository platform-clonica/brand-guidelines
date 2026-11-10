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
   Los titulares serif se quedan en la escala tal cual; el resto corre a
   **×2,25** sobre el lienzo social.

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
    px: 56,
    lineHeight: 1.3,
    family: 'serif',
    weights: [300, 400],
    origen: 'escala `title-sm` (2rem) ×1,75',
    uso:
      'Elementos de lista, filas de agenda, la firma del autor y el slug de la esquina. Medidos ' +
      '58, 49 y 49 sobre los PNG publicados: un solo peldaño los sostiene a los cuatro, que es ' +
      'mejor que inventar un número por rol. El slug va en serif y no en mono porque es una ' +
      'firma, no una etiqueta de interfaz. A 56 queda un 17 % POR ENCIMA de los diseños de ' +
      'referencia, por decisión de Martina: en el feed los veía pequeños. Se subió el peldaño ' +
      'entero y no solo el slug, para que la esquina no grite más que el contenido.',
  },
  {
    id: 'body',
    cssVar: '--s-body',
    px: 40,
    lineHeight: 1.55,
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `body` (1,125rem) ×2,25 — medido 40',
    uso: 'Cuerpo de texto de la tarjeta. El tamaño por defecto de todo lo que se lee seguido.',
  },
  {
    id: 'body-sm',
    cssVar: '--s-body-sm',
    px: 36,
    lineHeight: 1.55,
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `body-sm` (1rem) ×2,25',
    uso: 'Cuerpo secundario: subtítulo de portada, pie de foto, texto de apoyo.',
  },
  {
    id: 'caption',
    cssVar: '--s-caption',
    px: 22,
    lineHeight: 1.4,
    letterSpacing: '0.04em',
    family: 'mono',
    weights: [400, 500, 600],
    origen: 'escala `caption` (0,625rem) ×2,25',
    uso: 'Antetítulo, numeración de lista y notas auxiliares.',
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
