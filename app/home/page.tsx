import type { Metadata } from 'next';
import { GROUPS, appsIn } from '@/lib/home/catalog';
import { AppTile } from '@/components/home/AppTile';
import { LogoutButton } from '@/components/studio/LogoutButton';
import '@/components/home/home.css';

/* Dispatcher: la pantalla a la que se llega al iniciar sesión (lib/auth/safeNext.ts).
   Server component puro — los enlaces son <a> y cerrar sesión es un form POST, así que la página
   no embarca JavaScript de cliente. El acceso lo controla middleware.ts. */

export const metadata: Metadata = {
  title: 'Interactius',
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <div className="ix-home">
      <header className="ixh-header">
        <h1 className="ixh-header__title">Interactius</h1>
        <LogoutButton variant="avatar" className="ixh-header__logout" />
      </header>

      <main className="ixh-main">
        {GROUPS.map((group) => (
          <section className="ixh-section" key={group.id} aria-labelledby={`grupo-${group.id}`}>
            <h2 className="ixh-section__title" id={`grupo-${group.id}`}>
              {group.title}
            </h2>
            <div className="ixh-grid">
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
