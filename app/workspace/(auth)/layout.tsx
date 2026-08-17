import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BrandMark } from '@/components/studio/BrandMark';
import { colors } from '@/components/deck/studio/ui';

export const metadata: Metadata = {
  // Este login ya no es solo del DeckMaker: da acceso a todo /workspace.
  title: 'Acceso · Interactius',
  robots: { index: false, follow: false },
};

/* Shared chrome for the auth screens (login / forgot / reset): centered card on the
   warm-light brand background, con el imagotipo de Interactius encima. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    /* <main> y no <div>: estas pantallas no tenían NINGÚN landmark — ni main, ni nav, ni header —
       así que axe reportaba sus seis nodos como contenido fuera de toda región y el atajo de
       "saltar al contenido principal" no tenía destino. */
    <main
      style={{
        minHeight: '100vh', background: colors.warmLight, color: colors.dark,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, gap: 28,
      }}
    >
      {/* Logotipo completo: el login es la portada de la marca, no una barra interna.
          Envuelto en el <h1> de la página: tampoco había encabezado de nivel 1, y el nombre
          accesible sale del alt del imagotipo. Sin margen, para no mover un píxel. */}
      <h1 style={{ margin: 0, lineHeight: 0 }}>
        <BrandMark height={26} variant="lockup" />
      </h1>
      <div style={{ width: 'min(380px, 100%)' }}>{children}</div>
    </main>
  );
}
