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
   imagotipo (vuelve al workspace) · separador · nombre de la pieza ·
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
  children,
}: {
  titulo: string;
  onTitulo: (v: string) => void;
  user?: SessionUser;
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
      {/* El imagotipo vuelve al workspace. Es un enlace y no un botón
          porque aquí no hay cambios que avisar: todavía no se guarda. */}
      <BrandMark height={20} href="/workspace" label="Volver al workspace" />
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
