'use client';

import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { UserMenu } from '@/components/studio/UserMenu';
import type { SessionUser } from '@/lib/auth/sessionUser';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* El alto y el texto de TODOS los controles de la barra.

   La referencia es `toolbarBtn` de `components/deck/studio/ui.ts`, que es
   el botón secundario de la casa: 11 px a 500 y 31 de alto. Antes la barra
   tenía cinco alturas distintas (26, 29, 30, 31 y 33) porque cada control
   traía las suyas; ahora todos parten de aquí.

   El alto va fijo y no calculado por el relleno: un <input> no encoge su
   caja de contenido por debajo del alto normal de línea de su fuente, así
   que por relleno se quedaba más alto por mucho que se apretara. */
export const ALTO_BARRA = 31;
export const TEXTO_BARRA = `500 11px/1 ${MONO}`;

/* Barra superior del Social Maker.

   MISMA ANATOMÍA QUE EL RESTO DEL WORKSPACE, y eso no es estética: la
   herramienta vive en brand.interactius.com/workspace junto al Deck Maker,
   el Form Maker y los demás, y quien salta de una a otra tiene que
   reconocer dónde está sin pensarlo.

   El orden es el de DeckToolbar, FormToolbar y DsToolbar:
   imagotipo (vuelve a la lanzadera) · separador · nombre de la pieza ·
   acciones · menú de usuario.

   SIN EL WORDMARK DE LA HERRAMIENTA, y no es un olvido: ninguna barra de
   editor lo lleva. `DeckLogo`, `FormLogo`, `DsLogo` e `ImgLogo` aparecen
   solo en la galería de su herramienta. `SocialLogo` queda exportado en
   `components/studio/Wordmark.tsx` esperando a la galería del Social
   Maker, que todavía no existe.

   Los valores salen de ahí también: fondo Warm Light, filete Warm Dark,
   padding 10/16. Antes esta barra iba sobre blanco y con el nombre escrito
   a mano en mayúsculas, que no era de la familia. */
export function SocialToolbar({
  titulo,
  onTitulo,
  user,
  onInicio,
  children,
}: {
  titulo: string;
  onTitulo: (v: string) => void;
  user?: SessionUser;
  /** Volver a la lanzadera. Lo resuelve el editor, que es quien sabe si
      queda algo por guardar. */
  onInicio: () => void;
  /** Los controles propios de la herramienta, a la derecha de la marca. */
  children: React.ReactNode;
}) {
  return (
    <header
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', flexShrink: 0,
        borderBottom: `1px solid ${colors.warmDark}`, background: colors.warmLight, flexWrap: 'wrap',
      }}
    >
      {/* El imagotipo vuelve a la LANZADERA de la herramienta, no al
          workspace: desde dentro de un editor, un nivel arriba son las
          piezas, no el catálogo de aplicaciones. Es lo que ya dice la
          documentación de BrandMark.

          Y es un botón, no un enlace, por lo mismo que en DeckToolbar:
          un <a> navega de inmediato y se llevaría por delante lo que el
          autoguardado todavía no ha mandado. Antes era un enlace porque
          esta herramienta no guardaba nada; ahora sí. */}
      <button
        type="button"
        onClick={onInicio}
        title="Volver a las publicaciones"
        aria-label="Volver a las publicaciones"
        style={{
          appearance: 'none', border: 'none', background: 'transparent', cursor: 'pointer',
          padding: 0, display: 'inline-flex', alignItems: 'center', flexShrink: 0,
        }}
      >
        <BrandMark height={20} />
      </button>
      <MarkDivider />

      <input
        value={titulo}
        onChange={(e) => onTitulo(e.target.value)}
        aria-label="Nombre de la pieza"
        style={{
          height: ALTO_BARRA, boxSizing: 'border-box',
          font: TEXTO_BARRA, letterSpacing: '.04em', color: colors.dark,
          padding: '0 10px', minWidth: 180, maxWidth: 260,
          border: `1px solid ${colors.warmDark}`, background: colors.white,
        }}
      />

      {children}
      {user && <UserMenu user={user} />}
    </header>
  );
}
