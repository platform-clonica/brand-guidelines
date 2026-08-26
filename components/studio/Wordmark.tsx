import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* El lienzo se calcula, no se fija. IBM Plex Mono avanza 0.6em por glifo y aquí el texto va a 40px
   con `letter-spacing: 0.05em`, así que cada carácter ocupa 24 + 2 = 26px. Con los 16px de holgura,
   una marca de 9 caracteres (DeckMak_r, FormMak_r) da exactamente los 250 de siempre: los wordmarks
   existentes no se mueven ni un píxel. Los más largos (SocialMak_r, 11) ensanchan el viewBox en vez
   de salirse de él — un `viewBox` fijo los recortaba por la derecha, sin aviso. */
const GLYPH = 26;
const PAD = 16;

/* Marca de las herramientas internas (DeckMakr, FormMakr). SVG inline para que use la IBM Plex
   Mono ya cargada por la página en vez de un @import externo, con el acento de cursor (brick).

   Una sola implementación para las dos herramientas a propósito: son la misma familia visual y
   antes de esto el peso, el viewBox y el acento vivían en un único sitio para DeckMakr. Duplicarlo
   para FormMakr habría creado el clásico "mismo rol, dos valores". */
export function Wordmark({
  before,
  after,
  height = 30,
  title,
  muted = false,
}: {
  before: string;
  after: string;
  height?: number;
  title: string;
  /** Apagado: para una herramienta que todavía no existe (ver el dispatcher de /workspace). */
  muted?: boolean;
}) {
  const ink = muted ? colors.ash : colors.dark;
  const accent = muted ? colors.ash : colors.brick;
  // +1 por el guión bajo del acento, que también es un glifo.
  const width = (before.length + 1 + after.length) * GLYPH + PAD;

  return (
    <svg
      viewBox={`0 0 ${width} 80`}
      height={height}
      width={(height * width) / 80}
      role="img"
      aria-label={title}
      style={{ display: 'block' }}
    >
      <text
        x="0"
        y="49"
        textAnchor="start"
        fontFamily={MONO}
        fontWeight={700}
        fill={ink}
        fontSize="40"
        letterSpacing="0.05em"
      >
        {before}
        <tspan fill={accent}>_</tspan>
        {after}
      </text>
    </svg>
  );
}

export function DeckLogo({ height = 30, title = 'DeckMakr' }: { height?: number; title?: string }) {
  return <Wordmark before="DeckMak" after="r" height={height} title={title} />;
}

export function FormLogo({ height = 30, title = 'FormMakr' }: { height?: number; title?: string }) {
  return <Wordmark before="FormMak" after="r" height={height} title={title} />;
}
