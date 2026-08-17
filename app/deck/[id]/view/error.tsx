'use client';
/* Error boundary de la superficie comercial: la URL que se manda a un cliente para que lea y firme
   una propuesta. Es la que menos se puede permitir la pantalla genérica de Next.

   Va aquí y no solo en `app/global-error.tsx` porque este caso tiene un mensaje propio: quien abre
   este enlace no ha hecho nada mal y no puede arreglar nada, así que lo único útil es decirle que
   es temporal y darle un botón. */

import { useEffect } from 'react';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const SERIF = 'var(--font-ibm-plex-serif, Georgia, serif)';

export default function DeckViewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El digest es lo único que cruza esta pantalla con los logs de la función.
    console.error('[deck/view]', error.digest ?? '-', error.message);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#F5F2ED',
        color: '#1C1A17',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 clamp(24px, 8vw, 108px)',
      }}
    >
      <p style={{ font: `500 11px/1.4 ${MONO}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#75706B', margin: 0 }}>
        Interactius
      </p>
      <h1 style={{ font: `300 clamp(28px, 5vw, 44px)/1.25 ${SERIF}`, margin: '16px 0 0', maxWidth: '20ch' }}>
        La propuesta no se ha podido cargar
      </h1>
      <p style={{ font: `400 14px/1.7 ${MONO}`, color: '#75706B', margin: '20px 0 0', maxWidth: '52ch' }}>
        El enlace es correcto y la propuesta sigue ahí. Es un fallo temporal por nuestra parte.
        Vuelve a intentarlo en un momento.
      </p>
      <div style={{ marginTop: 28, display: 'flex', gap: 24, alignItems: 'center' }}>
        <button
          onClick={reset}
          style={{
            font: `500 13px/1 ${MONO}`, color: '#1C1A17', background: 'none', border: 0,
            padding: 0, textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
        {error.digest ? (
          <span style={{ font: `400 11px/1 ${MONO}`, color: '#75706B' }}>ref. {error.digest}</span>
        ) : null}
      </div>
    </main>
  );
}
