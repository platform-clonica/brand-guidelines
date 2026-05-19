/* Type scale — bilingual SSOT for the digital text system.
   Mirrors fontSize tokens defined in tailwind.config.ts. If you change one,
   change the other. Consumed by:
   - components/sections/SectionSistemaTexto.tsx (visible spec)
   - lib/llms.ts (AI ingestion)
   - app/api/brand.json/route.ts (programmatic) */

export type TypeFamily = 'mono' | 'serif';

export type TypeScaleEntry = {
  id: string;
  className: string;            // tailwind class without prefix, e.g. "text-super"
  clamp: string;                // "clamp(4rem, 2rem + 10vw, 12rem)" or static value
  lineHeight: string;
  letterSpacing?: string;
  family: TypeFamily;
  weights: readonly number[];   // canonical weights for this size
  sample: string;               // visual word/phrase rendered in the spec
  usage: { es: string; en: string };
};

export const typeScale: readonly TypeScaleEntry[] = [
  {
    id: 'super',
    className: 'text-super',
    clamp: 'clamp(4rem, 2rem + 10vw, 12rem)',
    lineHeight: '1.0',
    family: 'serif',
    weights: [300, 400],
    sample: 'Liminal',
    usage: {
      es: 'Hero de portada o sección de apertura. Una palabra o un titular muy corto.',
      en: 'Cover or opening-section hero. A single word or very short headline.',
    },
  },
  {
    id: 'display',
    className: 'text-display',
    clamp: 'clamp(3rem, 2rem + 5vw, 6rem)',
    lineHeight: '1.0',
    family: 'serif',
    weights: [300, 400],
    sample: 'interactīus',
    usage: {
      es: 'Titulares principales de sección dentro de un manual, landing o deck.',
      en: 'Primary section titles within a manual, landing page or deck.',
    },
  },
  {
    id: 'title',
    className: 'text-title',
    clamp: 'clamp(2rem, 1.4rem + 3vw, 4rem)',
    lineHeight: '1.05',
    family: 'serif',
    weights: [300, 400],
    sample: 'Decisión',
    usage: {
      es: 'Titulares de pieza de comunicación: post, artículo o slide principal.',
      en: 'Communication piece titles: post, article or primary slide.',
    },
  },
  {
    id: 'title-sm',
    className: 'text-title-sm',
    clamp: 'clamp(1.25rem, 1rem + 1.25vw, 2rem)',
    lineHeight: '1.15',
    family: 'serif',
    weights: [400],
    sample: 'Sistema',
    usage: {
      es: 'Subtítulos y separadores de sección dentro de una página o documento.',
      en: 'Subtitles and section dividers within a page or document.',
    },
  },
  {
    id: 'body',
    className: 'text-body',
    clamp: 'clamp(0.875rem, 0.8rem + 0.4vw, 1.125rem)',
    lineHeight: '1.55',
    family: 'mono',
    weights: [400],
    sample: 'Cada decisión refleja un criterio defendible.',
    usage: {
      es: 'Prosa de cuerpo en piezas digitales largas: landing extensa, blog, documento.',
      en: 'Body prose for long-form digital pieces: extended landing, blog, document.',
    },
  },
  {
    id: 'body-sm',
    className: 'text-body-sm',
    clamp: 'clamp(0.75rem, 0.7rem + 0.25vw, 1rem)',
    lineHeight: '1.5',
    family: 'mono',
    weights: [400, 500, 600],
    sample: 'Texto compacto y técnico de lectura corrida.',
    usage: {
      es: 'Tamaño canónico de lead y body en piezas compactas. Default del propio manual.',
      en: 'Canonical lead and body size in compact pieces. Default size of this manual.',
    },
  },
  {
    id: 'caption',
    className: 'text-caption',
    clamp: '0.625rem',
    lineHeight: '1.4',
    letterSpacing: '0.04em',
    family: 'mono',
    weights: [400, 500, 600],
    sample: 'EYEBROW · LABEL',
    usage: {
      es: 'Eyebrows, etiquetas, notas técnicas y elementos auxiliares de interfaz.',
      en: 'Eyebrows, labels, technical notes and auxiliary interface elements.',
    },
  },
];
