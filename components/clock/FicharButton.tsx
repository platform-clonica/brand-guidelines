'use client';
/* El botón de fichar.

   Qué se puede pulsar NO se decide aquí: lo dice `availableActions` sobre el día ya compilado, y
   tiene sus tests. Esto solo lo pinta. La primera acción es la principal y va con relleno; las demás
   quedan en secundario.

   El texto se escribe desde el punto de vista de quien ficha, no de quien controla: «Salir», no
   «Registrar salida». */

import type { ClockAction } from '@/lib/clock/actions';
import type { ClockMode } from '@/lib/clock/types';

const ETIQUETA: Record<ClockAction, string> = {
  in: 'Entrar',
  out: 'Salir',
  break_start: 'Empezar pausa',
  break_end: 'Volver de la pausa',
};

export function FicharButton({
  actions,
  mode,
  onMode,
  onFichar,
  busy,
}: {
  actions: ClockAction[];
  mode: ClockMode;
  onMode: (mode: ClockMode) => void;
  onFichar: (kind: ClockAction) => void;
  busy: boolean;
}) {
  const [principal, ...secundarias] = actions;

  return (
    <>
      <div className="ixc-modo" role="group" aria-label="Modalidad del tramo">
        <button type="button" aria-pressed={mode === 'onsite'} onClick={() => onMode('onsite')}>
          Presencial
        </button>
        <button type="button" aria-pressed={mode === 'remote'} onClick={() => onMode('remote')}>
          A distancia
        </button>
      </div>

      <div className="ixc-actions">
        <button type="button" className="ixc-btn" disabled={busy} onClick={() => onFichar(principal)}>
          {/* Sin puntos suspensivos: la norma de puntuación vale también para los estados de carga. */}
          {busy ? 'Guardando' : ETIQUETA[principal]}
        </button>

        {secundarias.map((accion) => (
          <button
            key={accion}
            type="button"
            className="ixc-btn ixc-btn--ghost"
            disabled={busy}
            onClick={() => onFichar(accion)}
          >
            {ETIQUETA[accion]}
          </button>
        ))}
      </div>
    </>
  );
}
