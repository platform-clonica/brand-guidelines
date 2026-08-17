'use client';
/* Red de última instancia para cualquier excepción no capturada en render.

   No había ninguna: `find app -name 'error.tsx' -o -name 'global-error.tsx'` devolvía cero, y el
   único fichero especial del árbol era `app/forms/not-found.tsx`. Sin esto, un throw en render
   cae en la pantalla por defecto de Next — fondo blanco, texto en inglés y un identificador
   hexadecimal — en un sitio cuyo visor de propuestas se manda a clientes.

   El `digest` solo sirve cruzado con un log de servidor, así que se registra en consola: es el
   único hilo que conecta lo que ve la persona con lo que pasó en la función. */

import { useEffect } from 'react';

const MONO = 'var(--font-ibm-plex-mono, monospace)';
const SERIF = 'var(--font-ibm-plex-serif, Georgia, serif)';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error.digest ?? '-', error.message);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#F5F2ED', color: '#1C1A17' }}>
        <main
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 clamp(24px, 8vw, 108px)',
          }}
        >
          <p style={{ font: `500 11px/1.4 ${MONO}`, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#75706B', margin: 0 }}>
            Interactius
          </p>
          <h1 style={{ font: `300 clamp(28px, 5vw, 44px)/1.25 ${SERIF}`, margin: '16px 0 0', maxWidth: '18ch' }}>
            Algo ha fallado en esta página
          </h1>
          <p style={{ font: `400 14px/1.7 ${MONO}`, color: '#75706B', margin: '20px 0 0', maxWidth: '52ch' }}>
            Es un fallo temporal por nuestra parte, no un problema de tu enlace. Vuelve a
            intentarlo; si sigue ocurriendo, escríbenos y te lo resolvemos.
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
      </body>
    </html>
  );
}
