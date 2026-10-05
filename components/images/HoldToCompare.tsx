'use client';
import { useRef, useState, type CSSProperties } from 'react';
import { colors } from '@/components/deck/studio/ui';
import { nextHold, type HoldEvent, type HoldSource } from '@/lib/images/hold';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* «Mantén pulsado para ver el original» (fase 2, F9): mientras se pulsa, quien lo usa enseña el original y el
   botón dice «Original». Con ratón, táctil y teclado (Espacio o Intro). La misma pieza en el modal de edición
   y en el detalle de una editada o sobrescrita.

   Al pulsar, el botón encoge («Original» es más corto) y el puntero puede quedar fuera. Por eso captura el
   puntero y cada gesto suelta solo con su propio final (lib/images/hold.ts). Soltar fuera del botón, perder
   el foco o que el sistema cancele el gesto también sueltan: nunca se queda enseñando el original sin que
   nadie pulse. */
export function HoldToCompare({ onHold, disabled = false, style }: { onHold: (holding: boolean) => void; disabled?: boolean; style?: CSSProperties }) {
  const [holding, setHolding] = useState(false);
  const source = useRef<HoldSource>(null);
  const apply = (event: HoldEvent) => {
    const was = source.current !== null;
    source.current = nextHold(source.current, event);
    const now = source.current !== null;
    if (now === was) return;
    setHolding(now);
    onHold(now);
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Sin captura sigue funcionando; solo vuelve a depender de no encoger bajo el puntero.
        }
        apply({ type: 'pointerdown', pointerId: e.pointerId });
      }}
      onPointerUp={(e) => apply({ type: 'pointerup', pointerId: e.pointerId })}
      onPointerLeave={(e) => apply({ type: 'pointerleave', pointerId: e.pointerId })}
      onPointerCancel={(e) => apply({ type: 'pointercancel', pointerId: e.pointerId })}
      onKeyDown={(e) => {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
          e.preventDefault();
          apply({ type: 'keydown' });
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          apply({ type: 'keyup' });
        }
      }}
      onBlur={() => apply({ type: 'blur' })}
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
