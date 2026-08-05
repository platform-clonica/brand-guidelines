'use client';
import { useState } from 'react';

/* Acciones de una tarjeta de galería — duplicar y eliminar.
   Única fuente de la interacción: DeckMaker y FormMaker la comparten para que el gesto sea
   el mismo en las dos herramientas. Antes cada una hacía la suya (el deck, papelera al pasar
   el puntero; los formularios, dos glifos de texto siempre visibles bajo la tarjeta).

   El tratamiento — icono blanco sobre tinta al 72%, esquina superior derecha de la miniatura,
   revelado al hover — viene de la papelera de la galería de imágenes.

   El contenedor NO se posiciona a sí mismo respecto a la miniatura: quien lo usa lo mete en un
   envoltorio `position: relative` que es también quien gobierna el `hover`. Tiene que ser así
   porque la miniatura es un <button> y estos también: anidarlos sería HTML inválido. */

const INK = 'rgba(28, 26, 23, .72)';
const INK_HOVER = 'rgba(28, 26, 23, .94)'; // mismo realce para todos: la fila se lee como una

export type CardActionIcon = 'copy' | 'trash';

export type CardAction = {
  icon: CardActionIcon;
  /** Sirve de `title` y de `aria-label`: descríbelo entero ("Duplicar «X»"), no solo el verbo. */
  label: string;
  onClick: () => void;
};

export function CardActions({ visible, actions }: { visible: boolean; actions: CardAction[] }) {
  return (
    <div
      style={{
        position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6,
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(.85)',
        transformOrigin: '100% 0',
        transition: 'opacity 120ms ease, transform 120ms ease',
        // Invisible no significa inerte: sin esto seguiría capturando el clic de la tarjeta.
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {actions.map((a) => (
        <ActionButton key={a.icon} action={a} />
      ))}
    </div>
  );
}

function ActionButton({ action }: { action: CardAction }) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      aria-label={action.label}
      title={action.label}
      onMouseEnter={() => setOver(true)}
      onMouseLeave={() => setOver(false)}
      onClick={(e) => {
        e.stopPropagation();
        action.onClick();
      }}
      style={{
        display: 'grid', placeItems: 'center', width: 26, height: 26, padding: 0,
        cursor: 'pointer', color: '#fff', border: 'none', borderRadius: 4,
        background: over ? INK_HOVER : INK,
        transition: 'background 120ms ease',
      }}
    >
      <ActionIcon name={action.icon} />
    </button>
  );
}

/* Los dos iconos, sueltos, para las superficies que no son tarjetas (la lista de "Abrir ▾"). */
export function ActionIcon({ name, size = 14 }: { name: CardActionIcon; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {name === 'copy' ? (
        <>
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </>
      ) : (
        <>
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
          <path d="M10 11v6M14 11v6" />
        </>
      )}
    </svg>
  );
}
