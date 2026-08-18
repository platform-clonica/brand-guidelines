'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';
import { LogoutButton } from './LogoutButton';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

export type SessionUser = {
  name: string;
  email: string;
  /** `picture`/`avatar_url` de Google. `null` si la cuenta no tiene foto. */
  avatarUrl: string | null;
};

/* La foto del usuario, y bajo ella un menú con "Cerrar sesión".

   Sustituye al botón de salir directo. El motivo no es estético: un botón de "Cerrar sesión"
   siempre visible cierra la sesión con un clic accidental, y eso en el editor significa perder lo
   que estuvieras escribiendo. Detrás de un menú hace falta intención — dos gestos, no uno.

   Reutiliza `LogoutButton` en lugar de repetir el `form` POST: ese componente existe justamente
   porque el formulario estaba copiado en DeckGallery y en FormGallery. Sigue siendo un POST sin
   JavaScript, así que cerrar sesión funciona aunque el menú falle.

   El patrón del desplegable —Escape cierra y devuelve el foco, capa transparente para cerrar al
   pulsar fuera— es el de components/studio/GalleryFilters.tsx, no uno nuevo. */
export function UserMenu({ user, className }: { user: SessionUser; className?: string }) {
  const [open, setOpen] = useState(false);
  const [fotoRota, setFotoRota] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const verFoto = user.avatarUrl && !fotoRota;

  return (
    <span className={className} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.name}`}
        style={{ ...disparador, borderColor: open ? colors.dark : colors.warmDark }}
      >
        {verFoto ? (
          /* <img> y no next/image a propósito, igual que BrandMark: son 32 px de un host externo
             (lh3.googleusercontent.com), así que optimizar no aporta y en cambio habría que abrir
             ese dominio en `images.remotePatterns` de next.config.mjs. `referrerPolicy` porque
             Google responde 403 a parte de las peticiones que llegan con Referer. Si la carga
             falla por lo que sea, caen las iniciales. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={user.avatarUrl as string}
            alt=""
            width={32}
            height={32}
            referrerPolicy="no-referrer"
            onError={() => setFotoRota(true)}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span aria-hidden style={iniciales}>{inicialesDe(user.name || user.email)}</span>
        )}
      </button>

      {open && (
        <>
          {/* Capa transparente: cerrar al pulsar fuera, mismo recurso que el desplegable de cliente. */}
          <span style={{ position: 'fixed', inset: 0, zIndex: 40 }} onMouseDown={() => setOpen(false)} />
          <div role="menu" aria-label="Cuenta" style={panel}>
            <div style={cabecera}>
              <div style={nombre}>{user.name}</div>
              <div style={correo}>{user.email}</div>
            </div>
            <LogoutButton variant="menu" />
          </div>
        </>
      )}
    </span>
  );
}

/* Dos iniciales: la del nombre y la del último apellido. Con una sola palabra, una basta. */
function inicialesDe(texto: string): string {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 1).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const disparador: CSSProperties = {
  appearance: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center',
  width: 34, height: 34, borderRadius: '50%', padding: 0,
  border: `1px solid ${colors.warmDark}`, background: colors.white, overflow: 'hidden',
};
const iniciales: CSSProperties = {
  font: `600 11px/1 ${MONO}`, letterSpacing: '.04em', color: colors.ash,
};
const panel: CSSProperties = {
  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 41,
  minWidth: 220, maxWidth: 'min(280px, 80vw)', textAlign: 'left',
  background: colors.white, border: `1px solid ${colors.dark}`,
};
const cabecera: CSSProperties = {
  padding: '11px 14px', borderBottom: `1px solid ${colors.warmDark}`,
};
const nombre: CSSProperties = {
  font: `600 11px/1.3 ${MONO}`, letterSpacing: '.04em', color: colors.dark,
};
const correo: CSSProperties = {
  font: `400 10px/1.4 ${MONO}`, color: colors.ash, marginTop: 3,
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
