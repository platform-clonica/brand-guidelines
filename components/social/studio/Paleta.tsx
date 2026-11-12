'use client';

import { FONDOS, type FondoOpcion } from '@/lib/social/fondos';
import { colors, toolbarBtn } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* La leyenda de fondos.
   ─────────────────────────────────────────────────────────────────────────
   Muestra, nombre y, al pasar por encima, lo que se escribirá en el texto.
   Es lo que evita tener que acordarse de si el beige se llama `warm-dark` o
   `arena`: se ve el color, se lee el nombre y se hace clic.

   La muestra lleva una letra encima, no es un cuadrado de color a secas.
   Un fondo no se elige en abstracto: se elige para que un texto se lea
   sobre él, y la «Aa» enseña justamente eso. */
export function Paleta({
  actual,
  onElegir,
  deshabilitado,
}: {
  actual?: string;
  onElegir: (f: FondoOpcion) => void;
  /** Sin tarjeta seleccionada, o es una con foto a sangre. */
  deshabilitado?: string;
}) {
  return (
    <div style={{ padding: 12, borderTop: `1px solid ${colors.warmDark}`, background: colors.warmLight }}>
      <p
        style={{
          font: `500 10px/1 ${MONO}`, letterSpacing: '.08em', textTransform: 'uppercase',
          color: colors.ash, margin: '0 0 10px',
        }}
      >
        Fondo de la tarjeta
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FONDOS.map((f) => {
          const elegido = actual === f.token;
          return (
            <button
              key={f.token}
              type="button"
              onClick={() => onElegir(f)}
              disabled={Boolean(deshabilitado)}
              title={deshabilitado ?? `${f.nombre} — se escribe {${f.token}}${f.nota ? `. ${f.nota}` : ''}`}
              style={{
                /* Parte del botón de barra de la casa (`toolbarBtn`) y solo
                   cambia lo que tiene que cambiar: el relleno de la
                   izquierda, para que entre la muestra. */
                ...toolbarBtn,
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px',
                cursor: deshabilitado ? 'not-allowed' : 'pointer',
                opacity: deshabilitado ? 0.45 : 1,
                /* El elegido se marca con el filete, no con otro color: el
                   color ya está ocupado diciendo cuál es el fondo. */
                border: `1px solid ${elegido ? colors.dark : colors.warmDark}`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 24, height: 24, background: f.hex, color: f.tinta,
                  border: `1px solid ${colors.warmDark}`,
                  display: 'grid', placeItems: 'center',
                  font: `400 11px/1 ${MONO}`,
                }}
              >
                Aa
              </span>
              {f.nombre}
            </button>
          );
        })}
      </div>

      {deshabilitado && (
        <p style={{ font: `400 10px/1.5 ${MONO}`, color: colors.ash, margin: '10px 0 0' }}>
          {deshabilitado}
        </p>
      )}
    </div>
  );
}
