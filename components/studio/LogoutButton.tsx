import type { CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Cerrar sesión. Un `form` POST a /workspace/logout, así que funciona sin JavaScript aunque el
   menú que lo contiene falle.

   Existe como componente porque el formulario estaba copiado en DeckGallery y en FormGallery, y
   el dispatcher habría sido la tercera copia. Hoy lo monta un solo sitio —UserMenu— pero se queda
   separado: es la pieza que no necesita cliente, y mezclarla con el desplegable la ataría a él.

   Tuvo dos variantes más, `bar` y `avatar`, y las dos se han retirado al quedarse sin uso: el
   botón rectangular de las cabeceras y un círculo que cerraba la sesión de un clic. Las cabeceras
   montan ahora la foto del usuario y cerrar sesión vive dentro de su menú. */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action="/workspace/logout" method="post" className={className} style={{ display: 'block' }}>
      <button type="submit" title="Cerrar sesión" aria-label="Cerrar sesión" role="menuitem" style={fila}>
        <PowerIcon />
        Cerrar sesión
      </button>
    </form>
  );
}

/* Fila del desplegable: ancho completo, sin filete propio — el panel ya lo pone. */
const fila: CSSProperties = {
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
