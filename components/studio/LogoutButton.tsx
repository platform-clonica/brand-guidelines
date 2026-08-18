import type { CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Cerrar sesión. Un `form` POST a /deck/logout, así que funciona sin JavaScript y no necesita
   'use client' — por eso el dispatcher puede ser un server component entero.

   Estaba copiado en DeckGallery y en FormGallery; el dispatcher habría sido la tercera copia.

   Dos variantes:
   - `bar`  — el botón rectangular de las cabeceras de las galerías.
   - `menu` — la fila dentro del desplegable de UserMenu, en el dispatcher.

   Había una tercera, `avatar`: un círculo con icono de apagado que cerraba la sesión de un clic.
   No la usaba nadie —el dispatcher montaba `bar`— y su comentario defendía una decisión que se ha
   revertido: ahora la foto del usuario abre un menú, precisamente para que cerrar sesión exija
   intención y no se dispare con un clic accidental. Se retira en vez de dejar código muerto que
   documenta lo contrario de lo que hace la aplicación. */
export function LogoutButton({
  variant = 'bar',
  className,
}: {
  variant?: 'bar' | 'menu';
  className?: string;
}) {
  const isMenu = variant === 'menu';

  return (
    <form action="/workspace/logout" method="post" className={className} style={isMenu ? { display: 'block' } : undefined}>
      <button
        type="submit"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        role={isMenu ? 'menuitem' : undefined}
        style={isMenu ? menuRowBtn : bar}
      >
        {isMenu && <PowerIcon />}
        Cerrar sesión
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

/* Fila del desplegable: ancho completo, sin filete propio — el panel ya lo pone. */
const menuRowBtn: CSSProperties = {
  appearance: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  border: 'none',
  background: 'transparent',
  color: colors.dark,
  padding: '11px 14px',
  font: `500 11px/1 ${MONO}`,
  letterSpacing: '.04em',
  textAlign: 'left',
};

function PowerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M8 2v6" strokeLinecap="round" />
      <path d="M4.6 4.2a4.6 4.6 0 1 0 6.8 0" strokeLinecap="round" />
    </svg>
  );
}
