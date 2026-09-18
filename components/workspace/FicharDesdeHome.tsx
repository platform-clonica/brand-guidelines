'use client';
/* Fichar desde la tarjeta del lanzador, sin entrar en la herramienta.

   Es la funcionalidad de la que depende que el registro sea real: la razón de sustituir Zoho era la
   fricción, y un registro que cuesta abrir se llena de olvidos.

   QUÉ SE PUEDE PULSAR NO SE DECIDE AQUÍ. Lo dice `availableActions` sobre el día ya compilado, y
   tiene sus tests. Esto recibe la acción resuelta en el servidor y la manda.

   Si no hay ficha —alguien que nunca ha entrado en Clock_r— no se ficha desde aquí: la tarjeta
   enlaza y ya. El alta y el aviso de protección de datos ocurren dentro de la herramienta, que es
   su sitio: dar de alta a alguien en el registro horario por el mero hecho de abrir el lanzador
   sería hacerlo antes de que haya visto el aviso. */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordEntry } from '@/lib/clock/api';
import type { ClockKind, ClockMode } from '@/lib/clock/types';

const ETIQUETA: Record<string, string> = {
  in: 'Entrar',
  out: 'Salir',
  break_start: 'Empezar pausa',
  break_end: 'Volver de la pausa',
};

export function FicharDesdeHome({
  accion,
  mode = 'onsite',
}: {
  /** `null` cuando no hay ficha todavía: entonces no se pinta nada. */
  accion: ClockKind | null;
  mode?: ClockMode;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(false);

  if (!accion) return null;

  const fichar = async () => {
    if (enviando) return;
    setEnviando(true);
    setError(false);
    try {
      await recordEntry({ kind: accion, mode, source: 'home_card' });
      /* Se recarga desde el servidor en vez de adivinar el estado siguiente: la acción que toca
         después la decide `availableActions` sobre los asientos, no esta tarjeta. */
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <button type="button" className="ixw-tile__ficha" onClick={fichar} disabled={enviando}>
      {/* Sin puntos suspensivos: la norma de puntuación vale también para los estados de carga. */}
      {error ? 'No se pudo fichar' : enviando ? 'Guardando' : ETIQUETA[accion]}
    </button>
  );
}
