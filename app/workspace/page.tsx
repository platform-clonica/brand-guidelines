import type { Metadata } from 'next';
import { GROUPS, appsIn } from '@/lib/workspace/catalog';
import { AppTile } from '@/components/workspace/AppTile';
import { BrandMark } from '@/components/studio/BrandMark';
import { LogoutButton } from '@/components/studio/LogoutButton';
import '@/components/workspace/workspace.css';

/* Dispatcher: la pantalla a la que se llega al iniciar sesión (lib/auth/safeNext.ts).
   Server component puro — los enlaces son <a> y cerrar sesión es un form POST, así que la página
   no embarca JavaScript de cliente. El acceso lo controla middleware.ts. */

/* Descripción validada con el motor de tono del repo (lib/eval.ts): 21 palabras, dentro del rango
   de sentenceLength (15-22), score 100, sin lista roja ni puntuación prohibida.

   Lleva `openGraph` propio a propósito. Next NO fusiona ese objeto con el del layout raíz: sin
   esto, un enlace al workspace pegado en Slack se anunciaría como "Interactius · Brand Guidelines
   2026", que es otra cosa. La imagen se repite para que la tarjeta no salga vacía. */
export const metadata: Metadata = {
  title: 'Workspace de Interactius',
  description:
    'Punto de entrada a las herramientas internas de Interactius: presentaciones, formularios y reescritura de textos con la voz de la marca.',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Workspace de Interactius',
    description:
      'Punto de entrada a las herramientas internas de Interactius: presentaciones, formularios y reescritura de textos con la voz de la marca.',
    type: 'website',
    images: [{ url: '/og-default.png', width: 1200, height: 630 }],
  },
};

export default function HomePage() {
  return (
    <div className="ix-workspace">
      {/* Misma cabecera que las landings de las herramientas: barra con filete inferior,
          imagotipo a la izquierda y cerrar sesión a la derecha. */}
      <header className="ixw-header">
        <h1 className="ixw-header__title">
          <BrandMark height={22} />
          <span className="ixw-sr">Interactius</span>
        </h1>
        <LogoutButton className="ixw-header__logout" />
      </header>

      <main className="ixw-main">
        {GROUPS.map((group) => (
          <section className="ixw-section" key={group.id} aria-labelledby={`grupo-${group.id}`}>
            <h2 className="ixw-section__title" id={`grupo-${group.id}`}>
              {group.title}
            </h2>
            <div className="ixw-grid">
              {appsIn(group.id).map((app) => (
                <AppTile key={app.id} app={app} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
