'use client';
import { useState, type CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* «Mantén pulsado para ver el original» (fase 2, F9): mientras se pulsa, quien lo usa enseña el original y el
   botón dice «Original». Con ratón, táctil y teclado (Espacio o Intro). La misma pieza en el modal de edición
   y en el detalle de una editada o sobrescrita.

   Soltar fuera del botón, perder el foco o que el sistema cancele el gesto también sueltan: nunca se queda
   enseñando el original sin que nadie pulse. */
export function HoldToCompare({ onHold, disabled = false, style }: { onHold: (holding: boolean) => void; disabled?: boolean; style?: CSSProperties }) {
  const [holding, setHolding] = useState(false);
  const set = (v: boolean) => {
    if (v === holding) return;
    setHolding(v);
    onHold(v);
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerLeave={() => set(false)}
      onPointerCancel={() => set(false)}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          set(true);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          set(false);
        }
      }}
      onBlur={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        appearance: 'none', border: `1px solid ${colors.warmDark}`, background: colors.white, color: colors.dark,
        font: `500 11px/1 ${MONO}`, letterSpacing: '.04em', padding: '9px 12px', cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none', opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {holding ? 'Original' : 'Mantén pulsado para ver el original'}
    </button>
  );
}
