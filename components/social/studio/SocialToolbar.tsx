'use client';

import { BrandMark, MarkDivider } from '@/components/studio/BrandMark';
import { SocialLogo } from '@/components/studio/Wordmark';
import { UserMenu } from '@/components/studio/UserMenu';
import type { SessionUser } from '@/lib/auth/sessionUser';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* Barra superior del Social Maker.

   MISMA ANATOMÍA QUE EL RESTO DEL WORKSPACE, y eso no es estética: la
   herramienta vive en brand.interactius.com/workspace junto al Deck Maker,
   el Form Maker y los demás, y quien salta de una a otra tiene que
   reconocer dónde está sin pensarlo.

   El orden es el de DeckToolbar, FormToolbar y DsToolbar:
   imagotipo (vuelve al workspace) · separador · marca de la herramienta ·
   nombre de la pieza · acciones · menú de usuario.

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
      <SocialLogo height={18} title="SocialMakr" />
      <MarkDivider />

      <input
        value={titulo}
        onChange={(e) => onTitulo(e.target.value)}
        aria-label="Nombre de la pieza"
        style={{
          font: `500 13px/1 ${MONO}`, letterSpacing: '.02em', color: colors.dark,
          padding: '7px 8px', minWidth: 180, maxWidth: 260,
          border: `1px solid ${colors.warmDark}`, background: colors.white,
        }}
      />

      {children}
      {user && <UserMenu user={user} />}
    </header>
  );
}
