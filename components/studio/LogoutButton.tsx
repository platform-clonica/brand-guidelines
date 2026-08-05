import type { CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Cerrar sesión. Un `form` POST a /deck/logout, así que funciona sin JavaScript y no necesita
   'use client' — por eso el dispatcher puede ser un server component entero.

   Estaba copiado en DeckGallery y en FormGallery; el dispatcher habría sido la tercera copia.

   Dos variantes:
   - `bar`    — el botón rectangular de las cabeceras de las galerías.
   - `avatar` — el círculo del dispatcher (/home). Es un botón de salir directo, no un menú:
                decisión tomada a sabiendas de que un clic accidental cierra la sesión. */
export function LogoutButton({
  variant = 'bar',
  className,
}: {
  variant?: 'bar' | 'avatar';
  className?: string;
}) {
  const isAvatar = variant === 'avatar';

  return (
    <form action="/deck/logout" method="post" className={className}>
      <button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión" style={isAvatar ? avatar : bar}>
        {isAvatar ? <PowerIcon /> : 'Cerrar sesión'}
      </button>
    </form>
  );
}

const bar: CSSProperties = {
  appearance: 'none',
  cursor: 'pointer',
  border: `1px solid ${colors.warmDark}`,
  background: colors.white,
  color: colors.ash,
  padding: '7px 12px',
  font: `500 10px/1 ${MONO}`,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
};

const avatar: CSSProperties = {
  appearance: 'none',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: `1px solid ${colors.ash}`,
  background: 'transparent',
  color: colors.ash,
  padding: 0,
};

function PowerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M8 2v6" strokeLinecap="round" />
      <path d="M4.6 4.2a4.6 4.6 0 1 0 6.8 0" strokeLinecap="round" />
    </svg>
  );
}
