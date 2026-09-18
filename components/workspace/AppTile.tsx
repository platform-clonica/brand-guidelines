import { Wordmark } from '@/components/studio/Wordmark';
import { AppIcon } from '@/components/workspace/AppIcon';
import type { AppEntry } from '@/lib/workspace/catalog';

/* Una tarjeta del dispatcher. Server component: sin estado, sin JavaScript.

   Deshabilitada (`href: null`) se renderiza como <div aria-disabled>, NO como un <a> sin destino:
   así no es focusable, no hay enlace muerto y el tabulador se la salta. El motivo ("Próximamente")
   es texto visible, no solo un atributo. */
export function AppTile({ app, overlay }: { app: AppEntry; overlay?: React.ReactNode }) {
  const shape = app.group === 'tools' ? 'ixw-tile--tool' : 'ixw-tile--link';
  const body = (
    <>
      <AppIcon id={app.id} />
      {app.wordmark ? (
        <Wordmark {...app.wordmark} title={app.label} height={22} muted={!app.href} />
      ) : (
        <span className="ixw-tile__label">{app.label}</span>
      )}
      {app.description && <span className="ixw-tile__desc">{app.description}</span>}
    </>
  );

  if (!app.href) {
    return (
      <div className={`ixw-tile ${shape} ixw-tile--off`} aria-disabled="true">
        {body}
      </div>
    );
  }

  const external = app.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};

  const enlace = (
    <a
      className={`ixw-tile ${shape}`}
      href={app.href}
      // El nombre accesible avisa de que se abre fuera; el texto visible no lo repite.
      aria-label={app.external ? `${app.label} (se abre en una ventana nueva)` : undefined}
      {...external}
    >
      {body}
    </a>
  );

  if (!overlay) return enlace;

  /* El botón va FUERA del enlace, no dentro: un <button> dentro de un <a> es HTML inválido y el
     clic sería ambiguo. Se apilan en un envoltorio, igual que CardActions se superpone a la
     miniatura de una galería en vez de anidarse en ella. */
  return (
    <div className="ixw-tile-wrap">
      {enlace}
      {overlay}
    </div>
  );
}
