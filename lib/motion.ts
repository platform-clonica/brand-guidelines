/* Motion system — SSOT bilingüe para curvas y tiempos de la marca.
   Consumido por:
   - components/sections/SectionMovimiento.tsx (spec visible)
   - lib/llms.ts (ingesta IA)
   - app/api/brand.json/route.ts (programático)

   Reglas: el movimiento es vehículo del concepto liminal. Cada curva y cada
   duración listadas aquí están en uso real en producción. No inventar nuevas
   sin razón documentada. */

export type Easing = {
  id: string;
  /* Display name (e.g. "expo", "hover-wipe", "page-curtain"). */
  name: string;
  /* Four cubic-bezier control points: [x1, y1, x2, y2]. */
  curve: [number, number, number, number];
  /* CSS literal — used for documentation and direct paste. */
  cssCubic: string;
  /* Tailwind transition-timing-function token, if registered. */
  tailwindToken?: string;
  /* GSAP equivalent, if applicable. */
  gsapToken?: string;
  /* Recommended companion duration in ms. */
  recommendedMs?: number;
  /* Where this easing is used, bilingual. */
  usage: { es: string; en: string };
};

export type Duration = {
  ms: number;
  usage: { es: string; en: string };
};

export const easings: readonly Easing[] = [
  {
    id: 'expo',
    name: 'expo',
    curve: [0.16, 1, 0.3, 1],
    cssCubic: 'cubic-bezier(0.16, 1, 0.3, 1)',
    tailwindToken: 'ease-expo',
    recommendedMs: 450,
    usage: {
      es: 'Curva por defecto del sistema. Aplica a transiciones laterales, hovers, aperturas de menú y aparición de cualquier elemento que entra desde el margen.',
      en: 'System default curve. Applies to lateral transitions, hovers, menu openings and the appearance of any element entering from the margin.',
    },
  },
  {
    id: 'hover-wipe',
    name: 'hover-wipe',
    curve: [0.45, 0, 0.15, 1],
    cssCubic: 'cubic-bezier(0.45, 0, 0.15, 1)',
    recommendedMs: 700,
    usage: {
      es: 'Underline wipe canónico en enlaces y botones. Movimiento horizontal pausado, perceptible pero discreto.',
      en: 'Canonical underline wipe on links and buttons. Slow horizontal motion, perceptible but discreet.',
    },
  },
  {
    id: 'page-curtain',
    name: 'page-curtain',
    curve: [0.77, 0, 0.175, 1],
    cssCubic: 'cubic-bezier(0.77, 0, 0.175, 1)',
    gsapToken: 'Power4.inOut',
    recommendedMs: 1100,
    usage: {
      es: 'Cortina de transición entre páginas. Velocidad uniforme con entrada y salida fuertemente atenuadas, sin rebote.',
      en: 'Page transition curtain. Uniform speed with strongly eased entry and exit, without bounce.',
    },
  },
];

export const durations: readonly Duration[] = [
  { ms: 200, usage: { es: 'Hover micro: cambio de color, opacidad o estado inmediato.',         en: 'Hover micro: colour, opacity or immediate state change.' } },
  { ms: 300, usage: { es: 'Transiciones de estado de UI: tabs, toggles, switch de idioma.',     en: 'UI state transitions: tabs, toggles, language switch.' } },
  { ms: 450, usage: { es: 'Movimientos laterales cortos: apertura de menú, slide de paneles.',   en: 'Short lateral motion: menu open, panel slide.' } },
  { ms: 700, usage: { es: 'Hover-wipe canónico de subrayado en enlaces y botones.',              en: 'Canonical hover-wipe underline on links and buttons.' } },
  { ms: 900, usage: { es: 'Reveal de imágenes por clip-path lateral derecha→izquierda.',        en: 'Image reveal via lateral right→left clip-path.' } },
  { ms: 1100, usage: { es: 'Cortina de transición entre páginas (cover + uncover).',             en: 'Page transition curtain (cover + uncover).' } },
];

/* Public production reference. Linked from the Motion section as canonical
   applied example of the brand in motion. */
export const heroReferenceUrl = 'https://www.interactius.com/';

/* Direct MP4 of the home hero — embedded in-situ inside the Motion section.
   Source of truth is the production deploy (interactius.com on Netlify). */
export const heroVideoUrl =
  'https://www.interactius.com/home/hero-poster.mp4';
