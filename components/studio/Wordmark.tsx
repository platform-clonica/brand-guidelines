import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

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
  align = 'left',
}: {
  before: string;
  after: string;
  height?: number;
  title: string;
  /** Apagado: para una herramienta que todavía no existe (ver el dispatcher de /home). */
  muted?: boolean;
  /* El viewBox es fijo pero el texto no: una marca corta (DSMak_r, 7 caracteres) deja hueco a la
     derecha y se ve desplazada dentro de una caja centrada. `center` la ancla al medio.
     Por defecto `left`, que es como se alinean las marcas en las cabeceras de las herramientas. */
  align?: 'left' | 'center';
}) {
  const ink = muted ? colors.ash : colors.dark;
  const accent = muted ? colors.ash : colors.brick;
  const centered = align === 'center';

  return (
    <svg
      viewBox="0 0 250 80"
      height={height}
      width={(height * 250) / 80}
      role="img"
      aria-label={title}
      style={{ display: 'block' }}
    >
      <text
        x={centered ? 125 : 0}
        y="49"
        textAnchor={centered ? 'middle' : 'start'}
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
