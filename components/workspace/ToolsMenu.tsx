'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BrandMark } from '@/components/studio/BrandMark';
import { AppIcon } from '@/components/workspace/AppIcon';
import { appsIn } from '@/lib/workspace/catalog';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* El imagotipo de la cabecera, con las Tools colgando al pasar por encima.

   El clic sigue llevando a la home: el menú es un atajo, no un sustituto. Quien no llegue a verlo
   —en una pantalla táctil no hay hover— pulsa y aterriza en el dispatcher, que es donde están
   todas las herramientas de todas formas. Esa es la razón de conservar el enlace y no convertir
   el imagotipo en un botón.

   Abre con el ratón Y con el foco. Un menú que solo responde a hover es inalcanzable con teclado,
   así que `onFocus` en el enlace lo abre igual y el panel se cierra cuando el foco sale de todo
   el bloque. Escape lo cierra desde donde sea. Es lo que pide WCAG 1.4.13 (contenido en hover o
   foco): descartable, alcanzable con el puntero y persistente.

   NO lleva role="menu". Eso promete a las tecnologías de apoyo una navegación por flechas que
   aquí no existe: son enlaces normales que se recorren con el tabulador, así que se anuncian como
   lo que son — una navegación con su lista. Prometer semántica de menú y no cumplirla es el mismo
   error que la auditoría encontró con `aria-modal` sin trampa de foco.

   El cierre lleva 140 ms de gracia. Sin ellos, el hueco entre el imagotipo y el panel basta para
   que el menú se cierre mientras bajas el ratón hacia él, que es el defecto clásico de este
   patrón. */
export function ToolsMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cajaRef = useRef<HTMLSpanElement>(null);

  const abrir = () => {
    if (cierre.current) clearTimeout(cierre.current);
    setOpen(true);
  };
  const cerrarConGracia = () => {
    if (cierre.current) clearTimeout(cierre.current);
    cierre.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => () => { if (cierre.current) clearTimeout(cierre.current); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const tools = appsIn('tools');

  return (
    <span
      ref={cajaRef}
      className={className}
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={abrir}
      onMouseLeave={cerrarConGracia}
      onFocus={abrir}
      /* El foco saliendo del bloque entero, no de un hijo: relatedTarget dice a dónde va. */
      onBlur={(e) => {
        if (!cajaRef.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <BrandMark height={22} href="/workspace" label="Interactius — ir al inicio" />

      {open && (
        <div style={panel}>
          <nav aria-label="Herramientas" style={caja}>
          <ul style={lista}>
          {tools.map((app, i) => {
            const ultima = i === tools.length - 1;
            const contenido = (
              <>
                <AppIcon id={app.id} size={22} />
                <span style={{ flex: 1, minWidth: 0 }}>{app.label}</span>
                {!app.href && <span style={pronto}>Próximamente</span>}
              </>
            );

            const borde = ultima ? { borderBottom: 'none' } : null;
            return (
              <li key={app.id}>
                {app.href ? (
                  <a href={app.href} style={{ ...fila, ...borde }}>{contenido}</a>
                ) : (
                  /* Sin destino no se pinta un enlace muerto: mismo criterio que AppTile. */
                  <span aria-disabled="true" style={{ ...fila, ...filaApagada, ...borde }}>{contenido}</span>
                )}
              </li>
            );
          })}
          </ul>
          </nav>
        </div>
      )}
    </span>
  );
}

/* Pegado al imagotipo, sin hueco: un espacio muerto entre disparador y panel es justo lo que hace
   que el menú se cierre de camino. El `paddingTop` hace de puente y deja el aire visual. */
const panel: CSSProperties = {
  position: 'absolute', top: '100%', left: -10, zIndex: 41, paddingTop: 10, minWidth: 210,
};
const caja: CSSProperties = {
  background: colors.white, border: `1px solid ${colors.dark}`,
};
const lista: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };
const fila: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
  borderBottom: `1px solid ${colors.warmDark}`,
  font: `500 11px/1.2 ${MONO}`, letterSpacing: '.04em', color: colors.dark, textDecoration: 'none',
};
const filaApagada: CSSProperties = { color: colors.ash, cursor: 'default' };
const pronto: CSSProperties = { font: `400 9px/1 ${MONO}`, color: colors.ash, letterSpacing: '.06em' };
